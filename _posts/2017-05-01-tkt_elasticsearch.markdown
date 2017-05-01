---
layout: post
category: search_engine
tags: [search_engine]
title:  "twitter korean text elasticsearch plugin을 공개합니다"
comment : true
---
기존에 [twitter korean text](https://github.com/twitter/twitter-korean-text)용 elasticsearch 플러그인이 있기는 했지만 
낮은 버전에서만 호환되어 최신 elasticsearch를 사용할 수 없었는데
[기존 소스](https://github.com/socurites/tkt-elasticsearch)를 수정하여 elastic 5버전과 호환되게 수정하였습니다.
만든지는 꽤 되었는데 작업용 맥북에서 세팅한 maven이 갑자기 제대로 동작을 안해서 
어찌어찌 고쳐서 겨우 github에 업로드 push하였습니다.

설치는 간단합니다!

설치된 elasticsearch 의 bin폴더로 이동한뒤 다음 명령어를 수행하시면 됩니다.
```
./elasticsearch-plugin install https://github.com/inyl/tkt_elasticsearch/raw/master/build/elasticsearch.zip
```

사실 별로 작업한 부분은 많지 않은데 처음 올려보는 오픈소스라 그런지 나름 고생했네요.<br/>

자세한 사항은 >>> [tkt_elasticsearch](https://github.com/inyl/tkt_elasticsearch) 를 참조해주세요.