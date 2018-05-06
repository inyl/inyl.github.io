---
layout: post
category: programming
tags: [java, spring]
title:  "Spring boot2로 Reactive Webflux API 만들기 2"
comment : true
thumbnail: https://source.unsplash.com/dC6Pb2JdAqs/846x343
---
우선 간단한 DB 테이블 Entity 한개를 만들어 보겠습니다. 간단한 게시물용 Entity입니다.

```java

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.Date;

@Entity(name = "board_post")
@Getter
@Setter
@Builder
public class BoardPost {
    @Column(name = "id", nullable = false)
    @Id
    @GeneratedValue(generator = "board-post-seq-gen", strategy = GenerationType.SEQUENCE)
    @SequenceGenerator(name = "board-post-seq-gen", sequenceName = "board_post_id_seq")
    private long id;

    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "created_date", nullable = false)
    @Builder.Default
    private Date createdAt = new Date();

    @Column(name = "updated_date", nullable = false)
    @Builder.Default
    private Date updatedAt = new Date();

    @Column(name = "author_id", nullable = false)
    private int authorId;

    @Column(name = "visibleYn")
    @Builder.Default
    private Boolean visibleYn = true;
}
```
Lombok의 annotation을 사용하여 getter, setter, builder code의 노가다는 하지 않습니다.

그리고 이 테이블에서 데이터를 가지고 올 Repository를 생성합니다.
```java
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {

}
```
여기까지는는 기존의 JPA를 사용하는 방법과 전혀 다른것이 없어서 설명은 생략하도록 하겠습니다.

그럼 작성한 코드가 제대로 동작하는지 테스트 코드를 짜보도록 하겠습니다.

```java
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@RunWith(SpringRunner.class)
@ActiveProfiles("local")
public class BoardPostRepositoryTest {
    @Autowired
    private BoardPostRepository repository;

    @Before
    public void init() {
        BoardPost post = BoardPost.builder()
            .title("title")
            .content("content")
            .build();

        repository.save(post);
    }

    @Test
    public void testFindAll() {
        Iterable<BoardPost> posts = repository.findAll();
        assertThat(posts).isNotEmpty();
    }

    @Test
    public void testFindById() {
        BoardPost postOne = BoardPost.builder()
                .title("one title")
                .content("one content")
                .build();

        repository.save(postOne);

        Optional<BoardPost> findOne = repository.findById(postOne.getId());

        assertThat(findOne.get().getTitle()).isEqualTo(postOne.getTitle());
        assertThat(findOne.get().getContent()).isEqualTo(postOne.getContent());
    }
}
```
`@DataJpaTest` annotation을 사용하면 Test코드에서 작성한 Repository를 Autowired를 사용하여 DI를 할 수 있습니다.
이게 일반적인 Component scan하고 다른점은 해당 코드는 테스트 코드이기 때문에 자동으로 rollback transaction이 적용된다는 것입니다.
즉 테스트가 종료되면 데이터는 다 롤백되기 때문에 마음껏 CRUD 코드를 작성해도 상관 없습니다.

```
2018-05-06 17:49:12.217  INFO 18111 --- [           main] o.s.t.c.transaction.TransactionContext   : Began transaction (1) for test context [DefaultTestContext@4b213651 testClass = BoardPostRepositoryTest, [생략] transaction manager [org.springframework.orm.jpa.JpaTransactionManager@566c1e71]; rollback [true]
Hibernate: call next value for board_post_id_seq
Hibernate: call next value for board_post_id_seq
2018-05-06 17:49:12.383  INFO 18111 --- [           main] o.h.h.i.QueryTranslatorFactoryInitiator  : HHH000397: Using ASTQueryTranslatorFactory
Hibernate: insert into board_post (author_id, content, created_date, title, updated_date, visible_yn, id) values (?, ?, ?, ?, ?, ?, ?)
Hibernate: select boardpost0_.id as id1_0_, boardpost0_.author_id as author_i2_0_, boardpost0_.content as content3_0_, boardpost0_.created_date as created_4_0_, boardpost0_.title as title5_0_, boardpost0_.updated_date as updated_6_0_, boardpost0_.visible_yn as visible_7_0_ from board_post boardpost0_
2018-05-06 17:49:12.592  INFO 18111 --- [           main] o.s.t.c.transaction.TransactionContext   : Rolled back transaction for test context [DefaultTestContext@4b213651 testClass = BoardPostRepositoryTest, [생략]
```
실제 테스트를 돌린 로그인데요 JpaTransactionManager 에 rollback transaction이 생성되어 있는것을 확인할 수 있습니다.  
그리고 하나 달라진게 있다면 Spring이 버전업되면서 `findById`나 `findOne`등의 단일 건을 return 하는 method가 이제 Optional로 리턴되게 변경되었습니다.  

근데 reactive 코드를 작성할려면 Router에 전달해줘야 하는 타입이 Flux나 Mono형식의 Stream만 가능한데 실제 Repository에서 가지고 온건 List 형식이기 때문에
뭔가 아다리가 맞지 않습니다. 따라서 `Flux.fromIterable`을 사용하여 Flux로 변환하여 Router에 전달해줍니다.

```java
import com.inyl.study.bootapi.board.controller.repository.BoardPost;
import com.inyl.study.bootapi.board.controller.repository.BoardPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class BoardPostHandler {
    @Autowired
    private BoardPostRepository repository;

    public Mono<ServerResponse> list(ServerRequest request) {
        List<BoardPost> posts = repository.findAll();
        Flux<BoardPost> boardPostFlux = Flux.fromIterable(posts);
        return ServerResponse.ok().body(boardPostFlux, BoardPost.class);
    }
}
```

아직 JDBC 드라이버가 비동기 코드를 지원하지 않아 이부분은 아직까진 어쩔 수 없긴 합니다.  
MongoDB나 Redis처럼 비동기 client를 사용하는 NoSQL들은 현재 Reactive용 Repository를 따로 사용할 수 있습니다.
`ReactiveCrudRepository` 등을 이용해서 Repository단에서 바로 Flux나 Mono로 조회가 가능합니다.
```java
public interface ReactivePersonRepository extends ReactiveCrudRepository<Person, String> {
  Flux<Person> findByLastname(Mono<String> lastname);

  @Query("{ 'firstname': ?0, 'lastname': ?1}")
  Mono<Person> findByFirstnameAndLastname(String firstname, String lastname);
}
```