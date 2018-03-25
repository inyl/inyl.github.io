---
layout: post
category: programming
tags: [java, spring]
title:  "Spring boot2로 Reactive Webflux API 만들기 1"
comment : true
thumbnail: https://source.unsplash.com/AfKyYsE9j6w/846x343
---
Spring boot2 GA출시 기념으로 Webflux 기반의 API를 한 번 만들어 보겠습니다.

## 프로젝트 준비

Spring boot 프로젝트는 [Spring Initialzr](https://start.spring.io/) 사이트에 접속하면 손쉽게 생성이 가능합니다.

사이트에 접속한뒤 적당한 Metadata항목을 입력하고 Dependency에 `Reactive Web`을 검색해서 Dependency를 추가합니다.
나머지 Dependency는 취향에 따라 넣어줍니다. 저는 우선 Gradle build의 Java 기반에 이정도의 Dependency를 가지고 진행할 예정입니다.
만일 현재 spring boot가 어떤 추가 라이브러리를 지원하는지 잘 모르겠다면 사이트 하단 `Switch to the full version.`
을 클릭하면 모든 라이브러리를 볼 수 있습니다.

![]({{site.url}}assets/imgs/boot2/boot1.png)

지원하는 모듈을 모두 설명하긴 어렵고 제가 추가한 Dependency만 간략히 설명을 드리자면

- Reactive Web : 해당 프로젝트의 전신이 되는 WebFlux Dependecy입니다.
- JPA : DB에 ORM으로 억세스 하기위한 Dependency 입니다.
- Actuator : 해당 어플리케이션을 관리하거나 모니터링에 도움이 되는 Dependency입니다.
- DevTools : boot application 개발시에 자동 재시작등을 지원해주는 Dependency입니다.
- PostgresSQL : Oracle, MySQL같은 Relation DB입니다.
- Lombok : Java 객체에 어노테이션으로 불필요한 노가다 작업을 방지해줄 수 있는 라이브러리입니다.
- JOOQ : JPA로 커버하기 힘든 쿼리를 위한 라이브러리로 QueryDSL과 유사합니다. 
저도 JOOQ를 써본적은 없지만 QueryDSL이 버전 릴리즈 안된지가 너무 오래되서 JOOQ로 한 번 갈아타보려고 합니다.

주의할점은 Reactive Web을 쓸때 일반 Web프로젝트를 추가해서는 안됩니다. 있다가 설명할건데 일반 Web을 동시에 같이 추가하면
설정이 꼬일 수 있기 때문에 Reactive Web만 추가해야합니다.


그다음 generate project 버튼을 눌러 파일을 다운받고 압축을 해제한뒤 자신이 사용하는 IDE로 열어줍니다.
만일 Intellij를 사용중이라면 `build.gradle` 파일을 Intellij로 열어주면 알아서 프로젝트 세팅을 해줍니다.

IDE에 프로젝트가 열리고 라이브러리들이 다운이 완료되었다면 프로젝트에 이미 하나 테스트 코드가 만들어져 있을것입니다.
Spring boot에서 테스트를 위한 어노테이션도 많이 지원해주는데 우선 `@SpringBootTest` annotation에
arguments로 `(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`
를 추가해줍니다. 해당 설정은 스프링 컨텍스트가 로딩될때 랜덤한 포트를 사용하게 설정 해주는건데
추가해주는 이유는 나중에 서버가 떠있는 상태에서 테스트를 돌리다 충돌나는 케이스를 방지하기 위해서입니다.
아래 코드는 예제입니다. (class 이름은 프로젝트명에 따라 다를 수 있습니다.)

```java
@RunWith(SpringRunner.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class BootapiApplicationTests {

    @Test
    public void contextLoads() {
    }

}
```

`contextLoads` 테스트를 돌려봅니다. boot가 기동되는데 문제없다면 tc는 성공할것입니다.
이것으로 기본적인 세팅은 끝났습니다.

## 프로젝트 실행
기존에 Spring boot를 써봤다면 알겠지만 기본적으로 was가 embbedding방식이기 때문에 따로 서버 설정을 잡아줄 필요는 없습니다.
Intellij라면 이미 우측 상단에 어플리케이션을 기동할 수 있는 Run Configuration이 세팅되어있을거고 만일 없으면
`@SpringBootApplication`이 붙은 Application class를 그냥 Run 하면 됩니다.

## Controller생성
Webflux의 Controller방식은 두가지가 있는 기존의 Controller방식과 Router방식이 있습니다.

아 우선 Controller를 만들기 전에 데이터 Object class를 한개 만듭시다.

```java
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class HelloWorld {
    private long id;
    private String title;
    private String message;
}
```
class 위에 붙은 많은 Annotation이 궁금하다면 [Lombok](https://projectlombok.org/)을 참고하세요

### RestController
```java
@RestController
public class HelloWorldController {
    @GetMapping("/hello")
    public Mono<HelloWorld> hello() {
        HelloWorld helloWorld = new HelloWorld();
        helloWorld.setTitle("hello");
        helloWorld.setMessage("hi");
        return Mono.just(helloWorld);
    }
}
```
기존 Spring 방식과 큰 차이는 없으며 대신 Flux와 Mono로 return 할 수 있게 되었습니다.
단일건은 Mono, 여러건을 리턴할때는 Flux를 사용하면 됩니다.

### RouterFunction
이번에 새롭게 추가된 방식입니다.
간략히 소스코드로 설명한다면
```java

@Component
public class HelloWorldHandler {
    public Mono<ServerResponse> helloWorld(ServerRequest request) {
        Mono<HelloWorld> helloworldMono = Mono.just(new HelloWorld(1, "hello", "hi"));
        return ServerResponse.ok().body(helloworldMono, HelloWorld.class);
    }
}

@Configuration
@EnableWebFlux
public class WebConfig implements WebFluxConfigurer {
    @Bean
    public RouterFunction<ServerResponse> routes(HelloWorldHandler handler) {
        return RouterFunctions.route(GET("/hello"), handler::helloWorld);
    }
}
```
간략하게는 위 RestController와 같은 역할을 하게 동작합니다.
그냥 보기에 Controller 방식보다 코드도 훨씬 길고 가독성도 떨어지는거 같은데 이게 뭔 의미가 있냐 싶다면
좀 더 Spring이 functional한 프로그래밍이 가능해졌다로 정리할 수 있을것 같습니다.

위 예제코드는 Java코드라서 실제 functional한 코드가 그리 의미 없어보일 수 있으나 다른 언어에서는 이런 매력적인 코딩이 가능해집니다.
다음은 코틀린의 예제입니다.

```kotlin
@Bean
fun route(): RouterFunction<*> = router {
    GET("/react/hello", { r ->
        ok().body(fromObject(
                Greeting("${r.attribute(KEY).orElse("[Fallback]: ")}: Hello")
        ))
    POST("/another/endpoint", TODO())
    PUT("/another/endpoint", TODO())
})
}
```
[코드출처 dzone.com](https://dzone.com/articles/spring-webflux-writing-filters)

이 functional방식은 크게 URL을 명시하는 Routerfunction, URL과 로직의 연결역할을 하는 HandlerFunction,
이 로직들을 특정 조건하에 처리할 수 있는 FilterFunction이 있습니다. 

이부분을 설명하는건 꽤 장문이 될거같아 나중에 다른 포스팅에서 다시 정리하는게 좋을것같고 우선 넘어가겠습니다.

앞으로의 예제는 이 RouterFunction기준으로 설명하겠습니다.

## Router Testing
Router를 만들었으니 이 Router가 제대로 동작하나 테스트를 해야합니다.
URL을 직접 쳐보는것도 방법이나 Spring boot는 이 Router를 테스트 할 수 있는 도구를 제공해줍니다.

앞서 작성한 Router의 spec을 다시 잠깐 살펴보겠습니다.

> "hello"라는 URL에 매핑  
> http method는 GET만 지원  
> 호출되면 id에 1, title에 "hello", message에 "hi"가 담긴 object가 리턴됨  

그럼 이제 이 spec을 테스트 할 수 있는 코드를 작성 해보겠습니다.
앞으로 작성되는 모든 코드는 TestCase와 함께 작성할것입니다.

```java
package com.inyl.study.bootapi.example;

import com.inyl.study.bootapi.example.handler.HelloWorldHandler;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@RunWith(SpringRunner.class)
@WebFluxTest
@Import(value = HelloWorldHandler.class)
public class HelloWorldControllerTest {
    @Autowired
    private WebTestClient webClient;

    @Test
    public void test_HelloWorldRouter() {
        // WebClient로 "hello"라는 URL을 호출
        HelloWorld responseBody = webClient.get().uri("/hello").exchange()
                .expectStatus().isOk() // 응답이 200인지 확인
                .expectBody(HelloWorld.class) // 리턴하는 객체가 HelloWorld 클래스인지 확인
                .returnResult().getResponseBody();

        // reponse된 객체에 원하는 결과값이 들어있는지 assert함.
        assertThat(responseBody.getId()).isEqualTo(1);
        assertThat(responseBody.getTitle()).isEqualTo("hello");
        assertThat(responseBody.getMessage()).isEqualTo("hi");
    }     
    
    @Test
    public void test_FailExecutePostMethod() {
        // POST는 지원하지 않는 method
        webClient.post().uri("/hello").exchange()
                .expectStatus().isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    }
}
```

Test클래스에 `@WebFluxTest`를 명시하면 WebTestClient 클래스를 autowired할 수 있습니다.
첫번째 test예제는 생성한 "/hello" URL이 응답이 정상적이고 리턴하는 객체 타입 및 리턴되는 값에 대한 검증을 하는 test이고
두번째 test예제는 GET만 지원하는 URL에 POST로 호출시에 http status가 405 (METHOD_NOT_ALLOWED)로 떨어지는지를 보기위한 테스트입니다.
WebTestClient는 이밖에도 특정 Header나 인증등을 처리하는 페이지를 검증하는데 매우 유용한 method들을 많이 지원하고 있습니다.

이제 겨우 Controller한개 만들었는데요 ㅠㅠ 나머지는 다음 포스팅으로 이어지겠습니다.