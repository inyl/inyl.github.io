---
layout: post
category: programming
tags: [circuit_breaker]
title:  "Curcuit Breaker"
comment : true
---

## Curcuit Breaker란?
과거에 웹환경은 매우 단순했고 외부와의 커넥션은 거의 RDB만 존재했었다.<br/>
하지만 현재의 웹환경은 시스템이 과거보다 매우 복잡해졌다.<br/>
RDB뿐만 아니라 캐시서버 나 세션 클러스터링을 위한 In Memory DB, Search Engine, Open API, BatchServer, log server등등!<br/>
문제는 이런 복잡해진 시스템들간의 연결 때문에 하나의 서비스만 문제가 생겨도 전체 서비스에 이슈가 생기는 케이스가 발생하기 마련이다.<br/>

만일 디비서버가 슬로우 쿼리 때문에 락이 걸려 현재 전송되는 모든 쿼리에 행이 걸렸다고 가정해보자.<br/>
물론 디비가 문제인 상황을 대비해서 대부분 timeout정도는 설정을 해두었을것이다.<br/>
그러나 커넥션에 read timeout을 설정 해놓았다 하더라도 보통 최소 5~10초 사이로 설정 해놓았을것이다.<br/>
너무 타임아웃시간을 짧게 잡았다가 실제 쿼리가 연산중임에도 불구하고 타임아웃 시간이 넘어 서비스가 오류가 발생하는 케이스도 있을 수 있기 때문이다.<br/>

문제는 5~10초정도의 시간이라도 이미 성질급한 사용자는 왜 페이지가 안뜨는데? 
하면서 새로고침 연타를 하게 될것이고 그결과 모든 was내의 thread가 다같이 행이 걸려 결국 서비스 전체가 죽게될것이다<br/>

서비스가 이런 상황에 놓이게 된다면 커넥션을 해봐야 어짜피 커넥션은 실패할것이다. 이미 디비가 정상적인 응답을 줄 수 없기 때문이다.<br/>
디비에서 문제를 열심히 해결하는 사이에도 성질급한 사용자들은 새로고침을 연타하면서 서버를 죽이고 있을것이다.<br/>

만일 사용중인 외부 로그 적재용 서버가 별도로 있는데 해당서버가 장애가 발생해서 커넥션이 밀리는 현상이 발생했다.<br/>
다른 서비스는 정상적이여서 서비스에 문제가 없지만 로그를 저장하지 못한다는 이유로 사용자는 계속 대기화면만 바라봐야하고있다!<br/>
이런 문제는 어떻게 해결해야할까?<br/>

리팩토링이란 책으로 유명한 마틴파울러 옹이 2014년에 자신의 블로그에 기술한 글이 있다.<br/>
[https://martinfowler.com/bliki/CircuitBreaker.html](https://martinfowler.com/bliki/CircuitBreaker.html)<br/>
Circuit Breaker(차단기)라는 개념인데 특정 횟수만큼의 커넥션 이슈가 발생하면 커넥션을 아예 시도하지 않고(차단 해버리고) 서비스가 정상화 되었을때 다시 커넥션을 재개하는 방식이다.<br/>
다음 이미지를 보면 이해가 좀 빠를것같다.<br/>
<img src="https://martinfowler.com/bliki/images/circuitBreaker/sketch.png" width="70%"/>

기존에 타임아웃 방식이 `request -> 커넥션 시도 -> 타임아웃 시간초과 -> 서비스 이용자에게 에러메시지 전송` 이었다면 Curcuit Breaker 패턴을 이용해서 아예 사전에 연결을 차단 해버리면 `request -> 차단 확인후 커넥션 시도안함 -> 서비스 이용자에게 에러메시지 전송`으로 더욱 빠르게 서비스 이용자에게 안내 메시지를 전송할 수 있다.<br/>
그리고 어짜피 실패할 죽은 커넥션 시도가 없으니 thread가 가득차서 서비스가 죽는 현상도 발생할리도 없고 장애에 대응하는 시간도 벌 수 있다.<br/>

그럼 지루한 이론은 여기까지 하고 실제 코드로 설명해보자.<br/>

## Code
자바 개발자라면 프로젝트에서 누구나 대부분 쓰고 있는 apache common.lang 을 이용 해보겠다.<br/>

우선 common lang최신버전을 프로젝트에 import한다. 2016년 10월 17일에 릴리즈된 `3.5`버전에 Curcuit Breaker가 따끈따끈하게 추가되었다.<br/>
우선 프로젝트에 3.5버전을 추가하자.<br/>

{% highlight xml %}
<dependency>
  <groupId>org.apache.commons</groupId>
  <artifactId>commons-lang3</artifactId>
  <version>3.5</version>
</dependency>
{% endhighlight %}

다음 예제를 보자.<br/>
{% highlight java %}
 EventCountCircuitBreaker breaker = new EventCountCircuitBreaker(5, 2, TimeUnit.MINUTE, 5, 10, TimeUnit.MINUTE);
 ...
 public void handleRequest(Request request) {
     if (breaker.checkState()) {
         try {
             service.doSomething();
         } catch (ServiceException ex) {
             breaker.incrementAndCheckState();
         }
     } else {
         // return an error code, use an alternative service, etc.
     }
 }
{% endhighlight %}

해당 예제는 리퀘스트가 오면 <b>breaker.checkState()</b> 로 해당 서비스에 접근해도 되는지를 판단후에 괜찮으면 service.doSomething()메서드를 실행시킨다.<br/>
만일 해당 서비스에 문제가 있다면 <b>breaker.incrementAndCheckState();</b>로 Curcuit Breaker의 오류 카운트를 증가 시킨다.<br/>

만일 <span style="color:red">2</span>분내로 <span style="color:red">5</span>번을 넘는 오류가 발생했다면(EventCountCircuitBreaker argument참고) Curcuit이 닫히게 되서 <b>breaker.checkState()</b>에서 false값이 리턴될것이고 그때 사용자에게 "서비스가 원할하지 않습니다. 잠시후 시도하세요." 같은 메시지를 전송 시키면 된다.<br/>
그리고 이렇게 닫힌 Curcuit은 <span style="color:red">10</span>분동안 유지된다.<br/>

만일 단순히 리퀘스트 횟수만을 참조하고 싶다면 이런식으로 설정할 수 있다.<br/>
{% highlight java %} 
 EventCountCircuitBreaker breaker = new EventCountCircuitBreaker(1000, 1, TimeUnit.MINUTE, 800);
 ...
 public void handleRequest(Request request) {
     if (breaker.incrementAndCheckState()) {
         // actually handle this request
     } else {
         // do something else, e.g. send an error code
     }
 }
 {% endhighlight %}
 
해당 예제는 만일 1분에 <b>1000</b>건이 넘는 리퀘스트가 온경우Curcuit을 닫아버린다. 이경우 else절에서 사용자에게 에러메시지를 전송하면 된다.<br/>
그리고 <b>800</b>건 이하로 리퀘스트가 줄어들면 다시 curcuit이 오픈된다.<br/>

간단한 코드니 어렵지 않게 curcuit breaker의 개념이 이해 됬으리라 생각된다.<br/>

curcuit breaker는 개념일 뿐이니 꼭 common.lang을 쓰지 않아도 상관없다.<br/>
Spring Framework를 쓴다면 어노테이션 방식으로 설정을 할 수 있게 기능이 제공된다.<br/>
[해당문서 참조](https://spring.io/guides/gs/circuit-breaker/)<br/>
아니면 Spring retry라고 비슷한 개념으로 기능을 제공해준다. java말고 다른 language로도 비슷한 기능을 지원하는 것들은 많이있다. <br/>
아무튼 장애가 된 서비스에 접근 시도를 하지 않고 다른 서비스를 제공해준다가 핵심이다.

## 정리
최근에 microservice같이 서비스 하나하나가 API로 분리 되있어 커넥션이 매우 많이 발생하는 시스템인 경우 이런 Curcuit Breaker개념이 매우 중요하다.<br/>
커넥션이 많으면 많을 수록 장애포인트도 많아지기 때문이다.<br/>
최근은 복잡한 어플리케이션 구조 때문에 장애가 아예 나지 않는것은 불가한 사항이라 판단하고, 장애발생시 그걸 적절히 우회하는 방식이 더 효과적인것 같다.<br/>
그리고 그 현명한 우회방식이 Curcuit Breaker Pattern에 있다고 보여진다. 