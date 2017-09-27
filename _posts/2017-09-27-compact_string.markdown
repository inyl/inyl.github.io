---
layout: post
category: programming
tags: [java]
title:  "Java 9 Compact String"
comment : true
---
Java 9 버전이 9월 21일부로 정식으로 릴리즈 되었습니다.
내부적으로 많은 변경이 있었는데요 많은 변경점중에 [JEP 254](http://openjdk.java.net/jeps/254)스펙인 Compact String에 대해 봐보고자 합니다.

기존 String class는 char형의 array를 감싼 형태를 취하고 있었습니다. 간략하게 구조만 놓고 보면
```java
class String {
  private final char value[];
}
```
다음과 같은 구조였습니다.
그런데 그것이 Java9에서는 byte array로 변경되었습니다
```java
class String {
  @Stable
  private final byte[] value;
}
```
딱 여기까지만 설명하면 이게 왜 바뀐거고 어떤 이득이 있는지 알기 힘들 수 있습니다.

자바의 기본 char형은 UTF-16기반의 2byte를 참조합니다. ([Character 문서 참조](https://docs.oracle.com/javase/7/docs/api/java/lang/Character.html))
자바의 문자열은 기본적으로 유니코드를 지원하기 때문에 영어를 쓴다 하더라도 2byte로 계산되었습니다.
이번에 개선된 String은 문자열에 따라 Latin-1(1byte)와 UTF-16(2byte)로 나누어집니다.
만일 영어만 있는 문자열의 경우 1byte의 영역을 차지하고요

![]({{site.url}}assets/imgs/cs/cs1.png)

만일 한글이라면 2byte를 차지합니다.

![]({{site.url}}assets/imgs/cs/cs2.png)

string이 차지하는 사이즈가 줄어들면 그만큼의 메모리 공간이 절약되며, 절약되는 공간만큼 Heap에 여유가 생긴다는것이고
결국 GC의 발생 자체가 적게 일어나는 효과를 볼 수 있습니다.
실제 [내부 벤치마킹](http://cr.openjdk.java.net/~shade/density/state-of-string-density-v1.txt) 으론
Latin형식의 문자열이 20%정도 빠르며 30%정도 가비지가 적은것을 알 수 있습니다.

근데 어짜피 한글은 기존하고 똑같으니 우리완 별 상관없는거 아니냐 할 수 있겠지만.
실제로 어플리케이션의 힙메모리 안에 가장 많은 영역을 차지하고 있는 instance는 String, 즉 char array가 일반적으로 제일 많으며
개발하면서 사용된 String도 물론 많겠지만 어플리케이션 내부의 참조 String이나, 추가한 오픈소스에서 사용되는 String들도 많습니다.

![]({{site.url}}assets/imgs/cs/cs3.png)

이런 string들 같은 케이스엔 훨씬 기존보다 사이즈가 경량화가 될 수 있겠죠.

그리고 내부의 데이터형이 변경되었기 때문에 String에서 char연산을 하는 부분의 코드가 모두 StringLatin1 class와 StringUTF16클래스로 나누어지게 변경되었습니다.
예를들어 기존의 String의 hashcode를 만드는 코드는
```java
// java8 hashcode
public int hashCode() {
    int h = hash;
    if (h == 0 && value.length > 0) {
        char val[] = value;

        for (int i = 0; i < value.length; i++) {
            h = 31 * h + val[i];
        }
        hash = h;
    }
    return h;
}
```
이었다면 현재는 두개로 나누어져
```java
// StringLatin hashcode
public static int hashCode(byte[] value) {
    int h = 0;
    for (byte v : value) {
        h = 31 * h + (v & 0xff);
    }
    return h;
}

// StringUTF16 hashcode
public static int hashCode(byte[] value) {
    int h = 0;
    int length = value.length >> 1;
    for (int i = 0; i < length; i++) {
        h = 31 * h + getChar(value, i);
    }
    return h;
}
```
로 나누어졌으며 내부의 거의 모든 method가 분기되어 처리되게 변경되었습니다.
String은 당연히 모든 어플리케이션이 사용하는 클래스다 보니 이런 구조 변경은 굉장히 리스크가 클텐데 꽤 과감한 변화가 아닐까 싶습니다.

이 방식은 JDK6때 compressed strings이라는 명칭으로 비슷하게 시도 되었다가 이슈가 있어 삭제되고 이번 9버전에 다시 적용 되었습니다.

아직 실사용적인 레벨에선 얼마만큼의 효과적인 성능 개선이 이루어질진 알 수 없지만 이미 존재하며 많이 사용하는 기능(클래스)에 대해 어떤 방식으로 퍼포먼스 튜닝에 접근 하는지에 대해
매우 흥미로운 시각으로 바라본 변경점이었습니다.



참고문헌 :

http://openjdk.java.net/jeps/254

http://cr.openjdk.java.net/~shade/density/state-of-string-density-v1.txt

http://www.baeldung.com/java-9-compact-string