---
layout: post
category: programming
tags: [DynamoDB, aws]
title:  "DynamoDB ttl 설정하기"
comment : true
---
DynamoDB는 시간이 지나면 데이터별로 자동으로 삭제되는 ttl(time to live)설정을 할 수 있습니다.

설정하는 방법은 다음과 같습니다.


우선 dynamoDB에 데이터를 저장 & 수정을 할때 필드를 하나 더 추가해야합니다.
추가로 저장되야 하는 이 값은 unix timestamp값으로 각 언어마다 기본적으로unix time을 추출하는 방법이 있을것입니다.
예를들면 python은 다음과 같습니다. 
```python
import time
now = int(time.time())
```

이것은 현재시간이고 만일 24시간후에 데이터가 파기가 되길 원한다면 다음처럼 시간을 더해줍니다.
```python
import time
ttl = int(time.time()) + (24 * 60 * 60)
```

이 값을 dynamoDB에 put할때나 update할때 같이 저장해줍니다. 필드이름은 이 예제에서는 'ttl'로 하겠습니다.

aws 관리메뉴의 하단에 `Manage TTL`을 누릅니다.

![](http://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/images/ttl_table.png)


TTL attribute에 방금전에 저장한 필드명을 지정합니다. Preview TTL은 내가 dynamoDB에 저장한 시간이 제대로 올바른지 미리 삭제될 데이터를 확인해볼 수 있습니다.
시간설정을 잘못해서 엉뚱한 데이터가 삭제되는것을 방지하기위해 꼭 확인 해보는걸 추천합니다.
그리고 한 번 설정하면 다시 TTL을 Disable했다가 Enable할수밖에 없는데 이게 시간이 약 한시간정도 소요되서 꼭 잘못 설정한건 없는지 미리 확인해보고 설정해야합니다.

<img src="http://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/images/ttl_manage.png" style="max-width:100%"/>

설정이 정상적이면 TTL로 설정한 필드에 마우스를 올려보면 해당 문서가 어느 날짜에 삭제되는지가 조회 가능합니다.

![](http://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/images/ttl_items.png)