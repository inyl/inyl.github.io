---
layout: post
category: programming
tags: [java]
title:  "Apache HttpComponent 제대로 사용하기"
comment : true
---
Java 어플리케이션에서 일반적으로 http호출을 할때 Apache HttpClient를 사용하며 http client가 버전업을 하여
Apache HttpComponent로 변경된것은 아마 다들 알고있는 사항일것입니다. (아주 옛날에 바꼈으니까)
근데 문제는 이 HttpComponent가 단순한 버전업이 아니라 내부 아키텍쳐가 아예 변경 되었음에도 불구하고 기존과 같은
사용방식을 하고 있는 케이스가 많아 (물론 기존처럼 써도 돌아는 갑니다만) 글을 정리해 보겠습니다.


## 무엇이 바뀌었나
기존의 간단한 HttpClient와는 다르게 여러 더 세부적인 옵션들을 Builder로 설정할 수 있습니다.
쿠키, 권한, dns, socket, redirect 전략등 여러 세부 설정을 할 수 있게 변경되었으며 이때문에 기존보다 좀 사용하는
코드가 복잡해지긴 했지만 더 로우레벨에 여러가지 http 호출을 생성하는게 가능해졌습니다.

## 왜 Component인가

여기서 이름이 HttpClient -> HttpComponent로 변경되었다는 사실을 생각해봐야 합니다. 왜 Component일까요?
간략하게 설명하자면 HttpClient가 기존과 다르게 작은 모듈과같은 개념으로 `재사용`가능하게 되었다는 뜻입니다.

HttpClient를 생성할때 아마 다음처럼 코드를 작성할것입니다.

```java
HttpClient httpClient =  HttpClients.createDefault();
// 이하생략
```

그러면 `createDefault` method는 내부에서 `HttpClientBuilder`를 통해서 HttpClient를 생성합니다
```java
/**
 * Creates {@link CloseableHttpClient} instance with default
 * configuration.
 */
public static CloseableHttpClient createDefault() {
    return HttpClientBuilder.create().build();
}

```

그럼 이 `build` method를 보게되면 어마무시한 코드량을 볼 수 있는데요 코드의 중간에 보면
```java
@SuppressWarnings("resource")
final PoolingHttpClientConnectionManager poolingmgr = new PoolingHttpClientConnectionManager(
    RegistryBuilder.<ConnectionSocketFactory>create()
        .register("http", PlainConnectionSocketFactory.getSocketFactory())
        .register("https", sslSocketFactoryCopy)
        .build(),
    null,
    null,
    dnsResolver,
    connTimeToLive,
    connTimeToLiveTimeUnit != null ? connTimeToLiveTimeUnit : TimeUnit.MILLISECONDS);
```
내부에서 `PoolingHttpClientConnectionManager`를 생성하는것을 알 수 있는데 즉 HttpComponent의 default는
Connection Pool로 이루어진것을 알 수 있습니다.

`createDefault`말고도 작은 사이즈의 Client를 만드는 `createMinimal` method 소스를 봐도 Pooling Manager를 사용하는것을 알 수 있습니다.

```java
/**
 * Creates {@link CloseableHttpClient} instance that implements
 * the most basic HTTP protocol support.
 */
public static CloseableHttpClient createMinimal() {
    return new MinimalHttpClient(new PoolingHttpClientConnectionManager());
}
```

즉 외부에서 argument인자로 다른 Http Manager를 쓰지 않게 하지 않는이상 HttpComponent는 기본적으로 Connection Pooling으로 동작하며
`createDefault`를 계속 호출하면 계속 새로운 Connection Pool을 생성한다는 의미입니다.
즉 이렇게 생성한 HttpClient를 계속 사용해야 한다는 의미입니다.

build method에서 생성되는 `InternalHttpClient` 와 `PoolingHttpClientConnectionManager` 를 보면 `@ThreadSafe`annotation이
붙어있는것을 알 수 있습니다. 즉 여러 thread에서 이 객체에 접근해서 사용해도 안전하다는 뜻입니다.

[HttpComponent예제](https://hc.apache.org/httpcomponents-client-4.5.x/httpclient/examples/org/apache/http/examples/client/ClientMultiThreadedExecution.java)
를 보시면 생성한 하나의 HttpClient를 여러 thread에서 사용할 수 있는것을 알 수 있습니다.

만일 Spring을 쓴다면 이렇게 쓸 수도 있겠죠.
```java
@Bean
public HttpClient httpClient() {
    // http client 생성
    return HttpClients.createDefault();
}

// --------------------------
// 다른 class
@Autowired
private HttpClient httpClient;

public void call() {
    HttpResponse response = null;
    try {
        response = hc.execute(new HttpGet("http://아무URL.com"));
        String responseText = EntityUtils.toString(response.getEntity());

    } catch (Exception e) {
        // error handling
    } finally {
        HttpClientUtils.closeQuietly(response);
    }
}

```

그럼 httpClient는 공유해서 써도 되니 HttpGet class도 공유해서 써도 되나요? 안됩니다. HttpGet은 thread safe하지 않습니다. 같이 쓰지 마세요.

그리고 목적에 따라서 다른 instance를 만들어놓고 쓰는것도 가능합니다.

```java
// method에 1,2,3 붙이는건 구리지만 그냥 예제니깐

@Bean
public HttpClient httpClient1() {
    // 단순 심플한 접속일땐 얘를 쓰자
    return HttpClients.createMinimal();
}

@Bean
public HttpClient httpClient2() {
    // 커넥션을 많이 해야하네?
    PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager();
    cm.setMaxTotal(300);
    cm.setDefaultMaxPerRoute(50);
    return HttpClients.custom().setConnectionManager(cm).build();
}

@Bean
public HttpClient httpClient3() {
    // 소켓 튜닝
    SocketConfig sc = SocketConfig.custom()
    .setSoTimeout(2000)
    .setSoKeepAlive(true)
    .setTcpNoDelay(true)
    .setSoReuseAddress(true)
    .build();

    return HttpClients.custom().setDefaultSocketConfig(sc).build();
}
```
미리 세팅해놓은 HttpComponent들을 골라 쓰는게 가능하겠죠.

그리고 `PoolingHttpClientConnectionManager`의 생성부분 소스코드를 보면 default pool이 낮은 수치로 잡혀있는것을 알 수 있습니다.
```java
/**
 * @since 4.4
 */
public PoolingHttpClientConnectionManager(
    final HttpClientConnectionOperator httpClientConnectionOperator,
    final HttpConnectionFactory<HttpRoute, ManagedHttpClientConnection> connFactory,
    final long timeToLive, final TimeUnit tunit) {
    super();
    this.configData = new ConfigData();
    this.pool = new CPool(new InternalConnectionFactory(
            this.configData, connFactory), 2, 20, timeToLive, tunit);
    this.pool.setValidateAfterInactivity(2000);
    this.connectionOperator = Args.notNull(httpClientConnectionOperator, "HttpClientConnectionOperator");
    this.isShutDown = new AtomicBoolean(false);
}
```
CPool의 인자를 보면 maxTotal은 20, defaultMaxPerRoute값은 2인것을 알 수 있습니다. 아마 여러 Component를 만들것을 생각해
기본 수치가 작은거 같긴한데 middleware간에 지속적인 많은 통신이 목적이라면 작은 수치라 적절히 늘려주는것을 권장합니다.

만일 이런 설정이나 동작방식이 너무 어려워 다루기 힘들다면 그냥 마음편히 3.x버전대 Apache HttpClient나 Spring의 RestTemplate를 쓰는게 좋을 수도 있습니다.
만일 HttpComponent를 [이런 심플한 예제](https://hc.apache.org/httpcomponents-client-4.5.x/httpclient/examples/org/apache/http/examples/client/ClientAbortMethod.java)만 보고
그대로 쭉 복붙으로 사용했다면 다른 client를 사용하는것보다 퍼포먼스가 나오지 않을것입니다.

## 정리
정리하면 HttpComponent를 쓸때는
- http client 계속 생성하지 말자.
- client는 multi thread에서 같이 써도 괜찮다.
- 오픈소스 사용시엔 문서와 소스코드를 잘 살펴보자.
