---
layout: post
category: search_engine
tags: [solr, search_engine]
title:  "Solr의 신규 랭킹 알고리즘 LTR"
comment : true
---

## LTR (Learning To Rank) 이란?
주로 기존 검색엔진들은 score 즉 정렬에 필요한 Similarity 알고리즘을 주로 `TF-IDF` 혹은 `BM25` 알고리즘에 의지하였다.<br/>
일반적으로 업체들도 검색엔진을 사용할때 보통 이 알고리즘들에 기반하고 자신의 비즈니스 로직에 의한 가중치값을 더 추가하여 서비스에 사용하였을것이다.<br/>
LTR (Learning To Rank)란 머신러닝으로 계산된 스코어를 기반으로 정렬하는것을 의미한다. 말만하면 지루하니 위키피디아에 있는 이미지를 봐보자.<br/>
<img src="https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/MLR-search-engine-example.png/250px-MLR-search-engine-example.png"/><br/>
색인된 인덱스 파일에서 유저 쿼리가 들어와 Similarity를 계산할때 머신러닝 알고리즘으로 Training된 데이터를 기반으로 스코어를 계산하여 랭킹모델에 사용한다는 것이다.<br/>

한줄요약하면 `스코어 만드는데 머신러닝 알고리즘 씀` 이다.

## Solr 적용
Solr의 최신버전인 6.5버전의 스펙에 이 LTR알고리즘이 추가되었다. 다만 아직 그냥 사용할수는 없고 solr를 기동할때 `--Dsolr.ltr.enabled=true` argument를 넘겨줘야한다.<br/>
아직 시험적인 적용이라 그러지 않을까 생각된다.<br/>
Solr Wiki의 예제를 따라가보자. 솔라 최신버전을 받고 압축을 해제한뒤 다음 명령어를 실행하자. <br/>
`bin/solr start -e techproducts -Dsolr.ltr.enabled=true`<br/>
기동이 성공적으로 되면 예제로 주어지는 techproducts볼륨도 함께 만들어지면서 기동된것을 확인할 수 있다. 다음 메시지가 뜨면 기동에 성공한것이다.<br/>

{% highlight shell %}
SimplePostTool version 5.0.0
Posting files to [base] url http://localhost:8983/solr/techproducts/update using content-type application/xml...
POSTing file gb18030-example.xml to [base]
POSTing file hd.xml to [base]
POSTing file ipod_other.xml to [base]
POSTing file ipod_video.xml to [base]
POSTing file manufacturers.xml to [base]
POSTing file mem.xml to [base]
POSTing file money.xml to [base]
POSTing file monitor.xml to [base]
POSTing file monitor2.xml to [base]
POSTing file mp500.xml to [base]
POSTing file sd500.xml to [base]
POSTing file solr.xml to [base]
POSTing file utf8-example.xml to [base]
POSTing file vidcard.xml to [base]
14 files indexed.
COMMITting Solr index changes to http://localhost:8983/solr/techproducts/update...
Time spent: 0:00:00.788
{% endhighlight %}

그 다음 json파일을 작성한다. 파일이름은 `myFeatures.json`이다
{% highlight json %}
[{
  "name": "documentRecency",
  "class": "org.apache.solr.ltr.feature.SolrFeature",
  "params": {
    "q": "{!func}recip(ms(NOW,last_modified),3.16e-11,1,1)"
  }
}, {
  "name": "isBook",
  "class": "org.apache.solr.ltr.feature.SolrFeature",
  "params": {
    "fq": ["{!terms f=cat}book"]
  }
}, {
  "name": "originalScore",
  "class": "org.apache.solr.ltr.feature.OriginalScoreFeature",
  "params": {}
}]
{% endhighlight %}

작성한 파일을 solr에 feature로 넘겨주자<br/>
`curl -XPUT 'http://localhost:8983/solr/techproducts/schema/feature-store' --data-binary '@/path/to/myFeatures.json' -H 'Content-type:application/json'`<br/>
만일 json syntax오류가 발생한다면 이 블로그에서 markdown -> html을 만들때 이상한 코드가 들어가서 그런거일 수 있으니 천천히 타이핑 해서 잘 만들어보자(--;;)

`http://localhost:8983/solr/techproducts/schema/feature-store/_DEFAULT_`로 접속해서 다음과 같이 추가한 피쳐들이 조회되면 성공이다.
{% highlight json %}
{
  "responseHeader":{
    "status":0,
    "QTime":23},
  "features":[{
      "name":"documentRecency",
      "class":"org.apache.solr.ltr.feature.SolrFeature",
      "params":{"q":"{!func}recip(ms(NOW,last_modified),3.16e-11,1,1)"},
      "store":"_DEFAULT_"},
    {
      "name":"isBook",
      "class":"org.apache.solr.ltr.feature.SolrFeature",
      "params":{"fq":["{!terms f=cat}book"]},
      "store":"_DEFAULT_"},
    {
      "name":"originalScore",
      "class":"org.apache.solr.ltr.feature.OriginalScoreFeature",
      "params":null,
      "store":"_DEFAULT_"}]}
{% endhighlight %}
적용시킬 스코어를 document의 쿼리 조건에 따라 적용할 수 있는것으로 판단된다.<br/>

이제는 model을 만들어야 한다. 적용하는 feature의 가중치(weight)를 설정하는것으로 판단된다. `myModel.json`으로 저장한다.
{% highlight json %}
{
  "class" : "org.apache.solr.ltr.model.LinearModel",
  "name" : "myModel",
  "features" : [
    { "name" : "documentRecency" },
    { "name" : "isBook" },
    { "name" : "originalScore" }
  ],
  "params" : {
    "weights" : {
      "documentRecency" : 1.0,
      "isBook" : 0.1,
      "originalScore" : 0.5
    }
  }
}
{% endhighlight %}

저장한 json파일을 solr에 다시 넣어준다.<br/>
`curl -XPUT 'http://localhost:8983/solr/techproducts/schema/model-store' --data-binary "@/path/myModel.json" -H 'Content-type:application/json'`<br/>

`http://localhost:8983/solr/techproducts/schema/model-store`로 접속되서 잘 학습되었는지 확인한다. 다음과 같은 response가 나오면 성공이다.<br/>
{% highlight json %}
{
  "responseHeader":{
    "status":0,
    "QTime":35},
  "models":[{
      "name":"myModel",
      "class":"org.apache.solr.ltr.model.LinearModel",
      "store":"_DEFAULT_",
      "features":[{
          "name":"documentRecency",
          "norm":{"class":"org.apache.solr.ltr.norm.IdentityNormalizer"}},
        {
          "name":"isBook",
          "norm":{"class":"org.apache.solr.ltr.norm.IdentityNormalizer"}},
        {
          "name":"originalScore",
          "norm":{"class":"org.apache.solr.ltr.norm.IdentityNormalizer"}}],
      "params":{"weights":{
          "documentRecency":1.0,
          "isBook":0.1,
          "originalScore":0.5}}}]}
{% endhighlight %}
여기서 설정한 "name":"myModel" 값과 weights를 조절하여 여러벌의 모델을 만들어서 A/B 테스트처럼 진행도 가능하다.

학습시킨 피쳐는 쿼리의 fl= 파라미터에 `[features]`를 추가해서 확인할 수 있고 학습시킨 feature는 solr에 기존에 있었던 re-rank쿼리를 이용해서 사용한다.<br/>
스코어를 한 번 유심히 봐보자<br/>
`http://localhost:8983/solr/techproducts/query?q=test&fl=id,score,[features]`
{% highlight json %}
{
  "responseHeader":{
    "status":0,
    "QTime":9,
    "params":{
      "q":"test",
      "fl":"id,score,[features]"}},
  "response":{"numFound":2,"start":0,"maxScore":1.959392,"docs":[
      {
        "id":"GB18030TEST",
        "score":1.959392,
        "[features]":"documentRecency=0.020832444,isBook=0.0,originalScore=1.959392"},
      {
        "id":"UTF8TEST",
        "score":1.5513437,
        "[features]":"documentRecency=0.020832444,isBook=0.0,originalScore=1.5513437"}]
  }}
{% endhighlight %}

다음은 re-rank를 적용한 쿼리이다. model json파일에서 사용한 이름이 여기서 model=을 지정할때 사용된다.<br/>
`http://localhost:8983/solr/techproducts/query?q=test&rq={!ltr model=myModel reRankDocs=100}&fl=id,score,[features]`
{% highlight json %}
{
  "responseHeader":{
    "status":0,
    "QTime":12,
    "params":{
      "q":"test",
      "fl":"id,score,[features]",
      "rq":"{!ltr model=myModel reRankDocs=100}"}},
  "response":{"numFound":2,"start":0,"maxScore":1.0005285,"docs":[
      {
        "id":"GB18030TEST",
        "score":1.0005285,
        "[features]":"documentRecency=0.020832442,isBook=0.0,originalScore=1.959392"},
      {
        "id":"UTF8TEST",
        "score":0.7965043,
        "[features]":"documentRecency=0.020832442,isBook=0.0,originalScore=1.5513437"}]
  }}
{% endhighlight %}

feature가 적용되어 스코어에 변동이 생긴것을 확인할 수 있다.<br/>
예제에서 검색된 두개의 문서는 카테고리필드(cat)에 book에 해당하는 것은 없어 isBook feature에는 스코어가 적용되지 않고 documentRecency필드로만 가중치가 적용된것으로 보여진다.<br/>

계산을 해보자면 myModel.json에 originalScore의 weight는 0.5 즉 절반만 사용하고 신상 가중치(recency)는 1.0 즉 전체를 사용한다고 설정했으니 <br/>
`(1.959392 * 0.5) + (0.020832442 * 1.0) = 1.0005285`가 되는 것이다.

사실 글을 작성하는 지금 시점에 아직 적절한 예제가 없어 기능만 간단히 테스트 해볼 수 있는 정도이다. 자세한 사항은
[Solr Wiki Learning To Rank Page](https://cwiki.apache.org/confluence/display/solr/Learning+To+Rank)를 참조 바라며 해당글은 기능 소개 정도로 정리하고 조만간 더 테스트를 한뒤 다시 글을 정리 해보는 시간을 가져야 할 것 같다.