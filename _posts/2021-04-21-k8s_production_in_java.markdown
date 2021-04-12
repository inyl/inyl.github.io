---
layout: post
category: programming
tags: [java, spring, kubernetis]
title:  "kubernetis production에 올리기 위한 Spring Boot"
comment : true
thumbnail: https://source.unsplash.com/CgyrwbE6Hm4/846x343
---

``
주의! 이글은 2021년 4월 12일에 씌여진 글로 최신 정보가 아닐 수 있습니다. 블로그글을 확인할때는 항상 최신글인지 먼저 확인하는 습관을 가집시다!
``

kubernetis는 기본적인 샘플 예제는 인터넷에서 많이 찾아 볼 수 있지만 실제 production 환경에서 사용하는 예제는 생각보다 많이 찾을 수 없습니다.
해당글은 실제 production에서 spring boot application을 운영 해보고 경험에 따른 글입니다. 

# jvm과 spring-boot 버전을 최신 버전으로

너무 당연한 말이지만 가급적 최신버전을 사용하라고 권하고 싶습니다. 왜냐하면 jdk 최신버전에는 container 환경에 적합한 기능들이 추가가 되어있고 최적화가 되어있기 때문인데
JVM은 가급적 LTS버전인 ``jdk11`` 이상. 그리고 boot 버전은 graceful shutdown을 제공해주는 ``2.3.0``이상을 추천 드립니다.
이하는 jdk 11버전이상을 사용한다면 권장드리는 jvm 옵션입니다.

## java 권장 설정
### XX:MaxRamPercentage
기존의 jvm 어플리케이션에서 사용하던 ``-Xms -Xmx``같은 메모리 관련 설정들은 가급적 사용하는것을 권장드리지 않습니다.

왜냐하면 pod에 cpu와 memory의 limit을 설정하는 기능이 있는데 jvm으로 메모리를 따로 설정하면 관리하기가 복잡해집니다.
예를들면 pod의 limit이 2G인데 실수로 jvm memory를 1G로 설정해서 메모리를 다 못쓰던지 반대로 limit은 1G인데 Xmx는 2G로 설정해
limit 메모리를 초과하여 pod이 재시작한다던지 이런 사소하지만 어이없는 실수를 할 수 있고 특히 개발환경하고 운영환경이 메모리 설정이 다른경우
이런 실수가 생각보다 흔히 발생합니다.

`--XX:MaxRAMPercentage=N` 옵션은 container의 메모리 상황에 따라 유동적으로 설정할 수 있기 때문에 이런 실수를 방지할 수 있습니다.
예를들어 pod의 메모리가 2기가로 설정되어있고 `--XX:MaxRAMPercentage=50`으로 설정하면 자동으로 jvm에서 힙메모리를 1기가로 설정합니다.
MaxRamPercentage옵션은 힙메모리를 설정하는 옵션이기 때문에 너무 높게 설정할시에 metaspace같은 non heap메모리 때문에 설정한 pod의 memory를 초과할 수 있습니다.
적절하게 pod의 메모리 상태를 관찰 한 뒤 50~80 정도로 설정하는것을 추천드립니다.

그리고 혹시 인터넷에서 `-XX:MaxRAMFraction` 과 같은 옵션을 보셨다면 최신버전에는 deprecated되었으니 그냥 편하게 MaxRamPercentage를 사용하시면 됩니다.
### GC옵션 끄기
기존처럼 한 application이 과도하게 큰 메모리 사이즈를 설정하는 케이스는 k8s환경에서는 잘 없기 때문에 (물론 있을수도 있겠지만)
작은 메모리 사이즈를 설정한다면 생각만큼 GC옵션 설정이 크게 중요하지 않을 수 있습니다.


특히 얼마든지 메모리 사이즈를 늘렸다 줄였다 할 수 있는 container의 구조상 내가 열심히 피땀흘려 GC 튜닝해놔도 pod의 메모리 크기가 바뀌거나
서버 node 환경이 바뀌면 튜닝한 설정이 무용지물 될 수도 있기 때문입니다. 그리고 jvm은 기본적으로 기동될때 현재 환경을 파악해서 적절한
GC정책을 설정하게 되어있기 때문에 (궁금하면 512m로 기동한 서버와 2G로 기동한 서버가 어떻게 다른지 GC 모니터링으로 확인하시면 됩니다)
가급적 그냥 JVM에서 권장하는 GC 옵션을 따라가라고 말씀 드리고 싶습니다. 


물론 나는 정말 GC튜닝에 자신있고 어플리케이션의 메모리를 매우 크게 설정해야하고 pod과 node의 환경이 변경될일이 적다라고 한다면 하셔도 상관없습니다.

### XX:ActiveProcessorCount

Java에서 Parrelel이나 non block의 thread size를 디폴트로 지정할때 일반적으로 cpu의 사이즈를 가지고 thread 개수를 설정합니다.
cpu가 쿼드코어이면 thread 개수는 4으로 유지하는것이죠
자바에서 cpu의 개수는
```java
Runtime.getRuntime().availableProcessors()
```
로 처리하는데 이 코드는 우리가 직접 짜지 않았어도 검색해보면 정말 많은 라이브러리에서 사용하는걸 알 수 있습니다.
어플리케이션이 cpu를 적게 사용한다고 낮은 cpu limit을 2이하로 설정해놓으면 우리 어플리케이션은 컨테이너 안에서 싱글코어처럼 동작하게 될수밖에 없습니다.
MSA에서 호출을 빠르게 한다고 병렬로 호출하는 코드를 뭐 reactive flux로 아무리 짜도 실제 서버에 올렸을때 쓸수 있는 cpu가 하나밖에 없기 때문에 병렬로 동작하지 않을 수 있다는 말입니다.
Flux class의 DEFAULT_POOL_SIZE가 어떻게 설정되어있는지 한 번 봐보세요


해결 방법은 두가지가 있는데 cpu limit은 그만큼 사용하지 않더라도 좀 여유있게 넉넉히 설정하거나 `-XX:ActiveProcessorCount=n` 옵션을 적용하는 것입니다.
cpu limit을 조절하는 방법을 추천드리지만 혹시나 자원 설정을 마음대로 하기엔 좀 껄끄럽다면 ActiveProcessorCount 설정을 추천드립니다.
설정하면 바로 server startup시간부터 달라지는것을 확인하실 수 있으실겁니다.

## spring 권장 설정
### graceful shutdown
최근 버전의 spring boot에서는 트래픽제어가 가능한 graceful shutdown을 제공 해줍니다.
설정도 매우 간단합니다.
```properties
server.shutdown=graceful
```
자세한것은 아래 문서를 참고 해주세요

https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html#boot-features-graceful-shutdown

### Liveness and Readiness
쿠버네티스는 pod의 healthcheck를 Liveness와 Readness의 두가지 상태로 관리합니다.
아주 간단하게 설명한다면 Liveness는 서버가 살아있는지 여부를 판단하는것이고 Readness는 어플리케이션이 응답할 수 있는지 여부를 판단하는 것입니다.
이또한 spring boot에서 제공 해줍니다.그리고 이 두가지는 health indicator에서 group으로 지정되기 때문에 커스텀한 체크 내용도 추가시킬 수 있습니다.

```yaml
management:
  endpoint:
    health:
      group:
        readness:
          include: "db"
```
자세한것은 아래 문서를 참고 해주세요

https://spring.io/blog/2020/03/25/liveness-and-readiness-probes-with-spring-boot

### actuator prometheus
보통 k8s 내부의 메트릭은 prometheus로 관리하는 경우가 많습니다.
prometheus에서 수집하기 편하게 미리 spring-boot에서 metric을 제공 해주고 있습니다.
spring-boot 설정으로 prometheus metric을 웹으로 리턴하게 설정한뒤에 prometheus로 수집해주면 됩니다.
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, prometheus
```
```yaml
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: 'prometheus'
    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.
    static_configs:
      - targets: ['127.0.0.1:9090']

  - job_name: 'spring-actuator'
    metrics_path: '/actuator/prometheus'
    scrape_interval: 5s
    static_configs:
      - targets: ['HOST_IP:8080']
```
### 기타


java application의 deployment를 세팅할때 memory limit은 가급적 requests와 limits을 동일하게 설정하기를 권장합니다.
즉 Qos를 Best Effort로 설정하기를 권장하는것인데 그 이유는 자바는 기본적으로 설정된 메모리를 극한으로 끌어서 최대한 사용하려고 하는
특성 때문에 limits의 최대치까지 대부분 사용하려 하는데 이때 서버의 메모리 여유가 없다면 linux oom kill이 발생할 수 있습니다.
차라리 남는 메모리가 없다면 그 서버에 deploy도 하지 말아라 라는 의미로 requests랑 limits의 메모리를 동일하게 설정하는게
서버 리스타트를 조금이라도 줄일 수 있습니다.

`-Xshare:on -XX:+UseAppCDS` 옵션으로 어플리케이션 기동시간을 높일 수 있다는 글이 인터넷에 많이 보이지만 테스트 해본적은 없어 확신하진 못하겠습니다.
AppCDS가 빨라진다는 글은 보이는데 pod과 pod사이에 잘 쉐어링이 가능한지 여부나 node에 균등하게 분배되는 환경에서 이 데이터 쉐어링이 
얼마나 효과를 볼 수 있을지에 대한 의문이 아직 있는 상태입니다. (사례가 있다면 추천 부탁드립니다)


https://spring.io/blog/2021/03/11/announcing-spring-native-beta
GraalVm의 native image building 기능을 활용한 spring native가 현재 베타 버전까지 와있습니다.
아직 사용할 수 있는 spring version도 한정적이고 제공해주는 라이브러리도 한정적이라 아직 실제 사용하긴 어려워 보이지만
관심가지고 지켜보기에 충분하다고 생각됩니다. (spring application이 100ms 이하로 기동된다고!!)