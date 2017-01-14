---
layout: post
tags: [dl4j, word2vec, machine_leaning]
category: machine_leaning
title:  "Word2Vec으로 상품 연관 키워드 추출하기"
comment : true
---

# Word2Vec
[Word2Vec](https://code.google.com/archive/p/word2vec) 은 최근 자연어 처리 부분에서 가장 각광받고 있는 기술중 하나로.<br/>
단어를 벡터로 표현해 서로 단어간의 거리를 계산하여 단어간의 상호 의미를 파악할 수 있는 기술입니다.<br/>
단순하게 설명하면 단어가 가진 의미를 기계에 학습시킬 수 있는것으로<br/>
보통 일반적인 컴퓨팅 문자열 연산 기준으로 "왕 + 여자" 는 단순하게 "왕여자"의 결과가 나오겠지만<br/>
학습된 결과로는 단어를 인지하여 "왕 + 여자 = 여왕" 의 결과가 나오게 됩니다.<br/> 
국내에도 잘 학습시킨 모델을 예제로 볼수있는 [사이트](http://w.elnn.kr/search/) 가 있어서 Word2Vec이 어떤것인지 체험해보실 수 있습니다<br/>

# DL4J
DL4J는 이름에서도 알수있다시피 자바용 딥러닝 라이브러리입니다.<br/>
최근 각광받는 Tensorflow나 Caffe등 여러 많고 좋은 라이브러리들이 Word2Vec을 지원하고 있으나<br/>
제가 DL4J를 선택한 이유는 Document가 상당히 잘되어있고 한글 번역상태도 굉장히 우수했기 때문입니다.<br/>
[DL4J의 문서](http://deeplearning4j.org/kr-word2vec) 는 한글번역이 굉장히 잘 되어있어 한번쯤 읽어보시는것을 추천 드립니다.<br/>
그리고 라이브러리도 머신러닝이나 딥러닝을 잘 모르는 사람도 이해하기 쉽게 깔끔하게 만들어져 있었습니다.<br/>

# train data
우수한 기술이라도 실제로 학습시켜보지 않으면 올바른 output이 나오지 않을꺼 같아 어떤 데이터로 학습시켜 볼까 고민하던중에<br/>
그냥 제일 구하기 쉬운(^^) 저희 회사의 상품 데이터 제목필드로 학습시켜 보면 어떨까하고 상품데이터 제목을 추출해봤습니다.<br/>
상품제목을 학습시키면 상품의 연관도를 계산할 수 있지 않을까 하는 호기심에서 시작하였습니다.<br/>
추출은 그냥 단순하게 DB에서 select 한 title을 plain text파일로 그냥 쭉 저장했습니다.<br/>
약 작업하고 나서 보니 970만건 정도 데이터로 다음 작업을 진행했습니다.<br/>

{% highlight java %}
// Strip white space before and after for each line
SentenceIterator iter = new BasicLineIterator(filePath);
// Split on white spaces in the line to get words
TokenizerFactory t = new DefaultTokenizerFactory();
t.setTokenPreProcessor(new CommonPreprocessor());

// manual creation of VocabCache and WeightLookupTable usually isn't necessary
// but in this case we'll need them
InMemoryLookupCache cache = new InMemoryLookupCache();
WeightLookupTable<VocabWord> table = new InMemoryLookupTable.Builder<VocabWord>()
    .vectorLength(100)
    .useAdaGrad(false)
    .cache(cache)
    .lr(0.025f).build();

log.info("Building model....");
Word2Vec vec = new Word2Vec.Builder()
    .minWordFrequency(5)
    .iterations(1)
    .epochs(1)
    .layerSize(100)
    .seed(42)
    .windowSize(5)
    .iterate(iter)
    .tokenizerFactory(t)
    .lookupTable(table)
    .vocabCache(cache)

    .build();

log.info("Fitting Word2Vec model....");
vec.fit();


//        Collection<String> lst = vec.wordsNearest("일본", 10);
//        log.info("Closest words to 'day' on 1st run: " + lst);

WordVectorSerializer.writeFullModel(vec, OUTPUT_SAVE_MODEL);
{% endhighlight %}

우선 저는 딥러닝 기술에 대해 잘 알지 못하니 Document페이지의 예제대로 우선 따라 써보았습니다.<br/>
학습 방법은 매우 심플합니다. `BasicLineIterator`를 이용하면<br/> 
txt파일을 읽어 라인별로 나눠 처리할 수 있는 iterator를 생성해줍니다.<br/>

그리고 Word2Vec.Builder로 word2vec객체를 생성한다음<br/>
`vec.fit();` 메서드 호출로 학습 시키기만 하면 끝입니다.<br/>
그리고 학습시킨 데이터 들을 추후에도 사용할 수 있게 <br/>
`WordVectorSerializer.writeFullModel(vec, '파일이저장될path');`<br/>
로 로컬에 파일로 떨궈줍니다.

이제 학습이 되었으면 `vec.wordsNearest("질의어", 10)` 메서드를 호출하면<br/>
질의어에 제일 근접한 단어 10개를 근접한 순서대로 return해줍니다.

# retrain
매번 수많은 양의 데이터를 다시 처음부터 학습 시킬 수는 없으니 학습시킨 데이터를 다시 불러와서 트레이닝 하겠습니다<br/>
저장은 위에 명시한대로 `WordVectorSerializer.writeFullModel(vec, '파일이저장될path');`<br/>
메서드로 간단하게 저장할 수 있고 이렇게 저장된 파일을<br/>
`Word2Vec vec = WordVectorSerializer.loadFullModel("파일이 저장된 path");`<br/>
로 불러와 다시 iterator를 생성시켜준뒤 사용하시면 됩니다.

# 형태소 처리
Word2Vec은 정상적으로 동작하는데 문제는 상품 제목이란게 사용자가 등록하는 텍스트다 보니<br/>
띄어쓰기 및 맞춤법이 엉망이어서 제대로 classification이 만들어 지지 않는 현상이 발생했습니다.<br/>
그러하여 제목을 한글 형태소 분석기로 한번 가공하여 조사나 부사같은 굳이 필요하지 않은 데이터를 제거하여<br/>
(저는 언어간의 유사도를 찾으려는 모델은 아니였으니)<br/>
Word2Vec의 학습모델로 전달하였습니다.<br/>
저는 업무적으로 사용하고 있는 사내 검색엔진을 이용하였고 일반적으로는 [은전한닢](http://eunjeon.blogspot.kr/) 이나 [komoran](http://shineware.tistory.com/) 같은 <br/>
오픈된 한글 형태소 분석기를 사용하시면 될것 같습니다.<br/>


# 결과물
<img src="{{site.url}}assets/imgs/dl4j1.png" />

"나이키"라는 어떤 브랜드명을 입력했을때 "플라이니트"라는 그 특정 상품의 브랜드가 연관단어로 뽑힌것을 확인하실 수 있습니다.<br/>
"빼빼로"라는 키워드를 검색시에 "페레로로쉐" 나 "기념일" 등의 단어가 뽑힌것은 매우 흥미로운 부분입니다.<br/>
반면에 "감자"라는 단어의 연관으로 "분식","야식"처럼 좀 애매한 단어가 뽑히는 경우도 있었습니다 (감자탕 떄문인건지..)<br/>

<img src="{{site.url}}assets/imgs/dl4j2.png" />

상품의 제목으로 word2vec을 학습시에 생각만큼 결과가 좋지는 않았습니다. <br/>
아무래도 상품 제목이 일반적인 문장이 아닌 형태가 많고 띄어쓰기 상태도 좋지 못하여 나타나는 현상이었으나<br/>
주로 브랜드명을 검색했을시에 상품 모델 번호라던지 비슷한 브랜드를 찾는다던지 하는 부분은 놀라웠습니다<br/>

좀 더 연구해서 더 좋은 퀄리티의 문장을 학습시키면 충분히 좋은 결과를 뽑을 수 있지 않을까 생각됩니다. ^^