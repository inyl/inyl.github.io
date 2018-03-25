---
layout: post
category: programming
tags: [lucene, search_engine]
title:  "lucene Index 파일 코드 파헤치기"
comment : true
---
요번 포스팅은 lucene은 파일을 어떤 방식으로 저장하나에 대한 개인적 호기심 탐구에 대한 내용을 포스팅 할것입니다.

lucene은 Solr와 ElasticSearch의 core이기 때문에 이 로직은 lucene을 이용한 검색엔진에서도 모두 동일하게 적용 된다라고 보시면 됩니다.
저장경로는 어떤 검색엔진을 쓰냐에 따라 각각 다르지만 기본적인 색인파일 저장공식은 동일하다고 볼 수 있습니다.

lucene소스 자체가 매우 복잡하여 모든 구조를 설명하는건 너무 제 능력밖의 범위기 때문에 중간중간 필름끊긴(?) 설명 양해 부탁 드립니다.

lucene의 addDocument method입니다. updateDocument를 바로 호출 하는것을 보면 실제로 lucene은 insert나 update나 내부구조상 별 차이가 없다는것을 알 수 있습니다.
```java
public long addDocument(Iterable<? extends IndexableField> doc) throws IOException {
  return updateDocument(null, doc); // 묻지도 따지지도 않고 바로 update 다이렉트 호출
}
```
IndexWriter의 updateDocument method는 DocumentsWriter의 updateDocument를 호출합니다.
```java
public long updateDocument(Term term, Iterable<? extends IndexableField> doc) throws IOException {
    ensureOpen();
    try {
      boolean success = false;
      try {
        long seqNo = docWriter.updateDocument(doc, analyzer, term); // DocumentsWriter의 updateDocument를 호출.
        if (seqNo < 0) {
          seqNo = - seqNo;
          processEvents(true, false);
        }
        success = true;
        return seqNo;
      } finally {
        if (!success) {
          if (infoStream.isEnabled("IW")) {
            infoStream.message("IW", "hit exception updating document");
          }
        }
      }
    } catch (AbortingException | VirtualMachineError tragedy) {
      tragicEvent(tragedy, "updateDocument");

      // dead code but javac disagrees:
      return -1;
    }
  }
```

```java
long updateDocument(final Iterable<? extends IndexableField> doc, final Analyzer analyzer,
      final Term delTerm) throws IOException, AbortingException {

    boolean hasEvents = preUpdate();

    final ThreadState perThread = flushControl.obtainAndLock();

    final DocumentsWriterPerThread flushingDWPT;
    long seqNo;
    try {
      // This must happen after we've pulled the ThreadState because IW.close
      // waits for all ThreadStates to be released:
      ensureOpen();
      ensureInitialized(perThread);
      assert perThread.isInitialized();
      final DocumentsWriterPerThread dwpt = perThread.dwpt;
      final int dwptNumDocs = dwpt.getNumDocsInRAM();
      try {
        seqNo = dwpt.updateDocument(doc, analyzer, delTerm); 
      } catch (AbortingException ae) {
        flushControl.doOnAbort(perThread);
        dwpt.abort();
        throw ae;
      } finally {
        // We don't know whether the document actually
        // counted as being indexed, so we must subtract here to
        // accumulate our separate counter:
        numDocsInRAM.addAndGet(dwpt.getNumDocsInRAM() - dwptNumDocs);
      }
      final boolean isUpdate = delTerm != null;
      flushingDWPT = flushControl.doAfterDocument(perThread, isUpdate);

      assert seqNo > perThread.lastSeqNo: "seqNo=" + seqNo + " lastSeqNo=" + perThread.lastSeqNo;
      perThread.lastSeqNo = seqNo;

    } finally {
      perThreadPool.release(perThread);
    }

    if (postUpdate(flushingDWPT, hasEvents)) {
      seqNo = -seqNo;
    }
    
    return seqNo;
  }
```

updateDocument부터 살짝 소스가 길어졌는데 DocumentWrite를 하기 위해 `flushControl.obtainAndLock()`을 호출하고
거기서 `DocumentsWriterPerThread`를 가지고 온다는 것을 알 수 있습니다.
flush는 그냥 간단하게 설명하자면, File로 flush한다고 하면 memory에 있는 데이터나 stream등을 file로 저장하는것을 flush한다라고
말할 수 있습니다.

이 `obtainAndLock` method를 살펴보면 이런 코드를 볼 수 있는데
```java
perThreadPool.getAndLock(Thread.currentThread(), documentsWriter);
```
결국 ThreadPool에서 DocumentWrite를 위한 Thread를 가지고 온다는 것을 알 수 있습니다. 여기서 `perThreadPool`은 
`DocumentsWriterPerThreadPool` 클래스이며 DocumentWrite를 위해서 ThreadPool을 사용하고 있는것을 알 수 있습니다.
thread pool을 쓴다는건 결국 multi thread를 사용하여 write한다 라는것을 알 수 있겠죠.

이 thread 1개당 `ThreadState` 클래스를 가지고 있는데 이 thread는 한개의 `DocumentsWriterPerThreadPool`을 가지고 있고
이것은 한개의 segment를 담당하고 있습니다.

복잡하죠? 워낙에 여러 클래스를 걸치다보니 어떻게 해야 쉽게 설명이 될지 모르겠네요.ㅠㅠ

다시 updateDocument method를 보면
```java
ensureOpen();
ensureInitialized(perThread);
```
document를 write하기 전에 문제가 안생기도록 미리 Initialize 하는 과정입니다. 
`ensureOpen` 은 그냥 buffer에데이터가 있나 체크여부니까 넘어가고 `ensureInitialized`를 보면
```java
private void ensureInitialized(ThreadState state) throws IOException {
  if (state.dwpt == null) {
    final FieldInfos.Builder infos = new FieldInfos.Builder(writer.globalFieldNumberMap);
    state.dwpt = new DocumentsWriterPerThread(
      writer, writer.newSegmentName(), directoryOrig,
      directory, config, infoStream, deleteQueue, infos,
      writer.pendingNumDocs, writer.enableTestPoints);
  }
}
```
여기서 `DocumentsWriterPerThread` 클래스를 생성 한다는것을 알 수 있습니다. 
argument개수가 완전 어마 무시한데요 2번째 argument인 `writer.newSegmentName()` method를 살펴봅시다.
```java
final String newSegmentName() {
  // Cannot synchronize on IndexWriter because that causes
  // deadlock
  synchronized(segmentInfos) {
    // Important to increment changeCount so that the
    // segmentInfos is written on close.  Otherwise we
    // could close, re-open and re-return the same segment
    // name that was previously returned which can cause
    // problems at least with ConcurrentMergeScheduler.
    changeCount.incrementAndGet();
    segmentInfos.changed();
    return "_" + Integer.toString(segmentInfos.counter++, Character.MAX_RADIX);
  }
}
```
이 이미지의 파일명 naming 규칙이 여기서 결정됩니다. segment name은 ` "_" + (segment count를 36진수로 변환한값)` 이라는것을 알 수 있습니다.

대충 이 이미지에서 파일명이 어떻게 결정이 난건지 알 수 있네요.

그리고 `DocumentsWriterPerThread` 클래스가 생성될때
```java
segmentInfo = new SegmentInfo(directoryOrig, Version.LATEST, segmentName, -1, false, codec, Collections.emptyMap(), StringHelper.randomId(), new HashMap<>(), null);
```
segment의 정보를 가지고 있는 `SegmentInfo` 클래스도 같이 생성되고 있습니다.
```
DocumentsWriterPerThreadPool
  ThreadState
    DocumentsWriterPerThread
      SegmentInfo
```
대충 이런구조로 클래스 instance가 위치하고 있다..라고 보면 될거같습니다. (실제에 비해 너무 많이 축약되긴 했지만)

다시 updateDocument로 돌아와서 결국 이 코드는
```java
seqNo = dwpt.updateDocument(doc, analyzer, delTerm); 
```
하나의 segment에 document를 update(insert) 하는 코드이구나. 하는것을 알 수 있습니다.

updateDocument가 완료되면 이제 파일로 저장을 할 차례인데
```java
postUpdate(flushingDWPT, hasEvents)
```
method를 한 번 살펴보겠습니다. 이 코드는 `DocumentsWriterFlushControl` 클래스에 존재합니다.
```java
private boolean postUpdate(DocumentsWriterPerThread flushingDWPT, boolean hasEvents) throws IOException, AbortingException {
  hasEvents |= applyAllDeletes(deleteQueue);
  if (flushingDWPT != null) {
    hasEvents |= doFlush(flushingDWPT);
  } else {
    final DocumentsWriterPerThread nextPendingFlush = flushControl.nextPendingFlush();
    if (nextPendingFlush != null) {
      hasEvents |= doFlush(nextPendingFlush);
    }
  }

  return hasEvents;
}
```
flushDWPT객체가 null이 아니면 doFlush()를 실행시키네요.
doFlush는 결국 
```java
// flush concurrently without locking
final FlushedSegment newSegment = flushingDWPT.flush();
```
flushingDWPT 객체의 flush()를 실행시킵니다.
```java
consumer.flush(flushState);
pendingUpdates.terms.clear();
segmentInfo.setFiles(new HashSet<>(directory.getCreatedFiles()));
```
consumer에 flush를 실행하고 consumer는 각 codec에 write를 실행시킵니다.

색인파일을 보면 실제로 하나의 segment에 여러개의 확장자로 나누어져 있는것을 확인할 수 있는데 `TrackingDirectoryWrapper`에 그 파일들의 정보가 들어있다고 보면 됩니다.
어디서 이 file list 목록을 채워주냐면 위에 언급한듯이 lucene은 색인을 위해 docConsumer를 사용하고 그 consumer는 codec을 이용해 파일로 write합니다.

(얘기를 어디서 끊어야 할지 모르겠다)

lucene은 색인 정보에 따라 각기 다른 codec들을 사용하며 사용하는 codec들은 `org.apache.lucene.codecs` 경로에 위치 해있으며 
버전별로 따로 패키지가 나누어져 있습니다. 

인덱스 파일 유형은 6.2버전 기준으로 다음과 같습니다.


| Name |	Extension |	Brief  Description |
|------|------------------|-------------|
| Segments File |	segments_N |	Stores information about a commit point |
| Lock File |	write.lock |	The Write lock prevents multiple IndexWriters from writing to the same file. |
| Segment Info |	.si |	Stores metadata about a segment |
| Compound File |	.cfs, .cfe |	An optional "virtual" file consisting of all the other index files for systems that frequently run out of file handles. |
| Fields |	.fnm |	Stores information about the fields |
| Field Index |	.fdx |	Contains pointers to field data |
| Field Data |	.fdt |	The stored fields for documents |
| Term Dictionary |	.tim |	The term dictionary, stores term info |
| Term Index |	.tip |	The index into the Term Dictionary |
| Frequencies |	.doc |	Contains the list of docs which contain each term along with frequency |
| Positions |	.pos |	Stores position information about where a term occurs in the index |
| Payloads |	.pay |	Stores additional per-position metadata information such as character offsets and user payloads |
| Norms	 |.nvd, .nvm	 |Encodes length and boost factors for docs and fields |
| Per-Document Values |	.dvd, .dvm |	Encodes additional scoring factors or other per-document information. |
| Term Vector Index |	.tvx |	Stores offset into the document data file |
| Term Vector Documents |	.tvd |	Contains information about each document that has term vectors |
| Term Vector Fields |	.tvf |	The field level info about term vectors |
| Live Documents |	.liv |	Info about what files are live |
| Point values |	.dii, .dim |	Holds indexed points, if any |

따라서 저장된 파일이 어떤 유형의 인덱스내용이 저장되어있는지는 위의표를 참조하시면 됩니다

내용이 너무 길어 총 요약하자면

- lucene은 색인시 add를 해도 update를 호출한다.
- 색인시 각 segment별로 thread가 나누어져 색인된다. (맞나?)
- 색인파일명은 segment count를 36진수로 변환한 값을 사용한다.
- 색인시 lucene은 codec을 이용하여 index를 각 데이터 유형별로 분기하여 저장하고 그것은 각 확장자 별로 저장된다.

제가 코드를 잘못읽고 오해한 부분이 있을 수 있으니 만일 그런 부분이 있다면 따끔하게 지적 부탁 드립니다.