---
layout: post
category: programming
tags: [java]
title:  "Java 9 Jshell"
comment : true
---
Java 9 버전에 추가된 항목들중에 개인적으로 베스트로 뽑는 Jshell을 소개드립니다.  
간단히 설명하면 Jshell은 자바코드를 바로바로 치면서 마치 인터프리터 언어처럼 결과를 확인할 수 있는 커맨드 라인 툴입니다.  
REPL(Read Eval Print Loop)라고 하기도 하는데요.  
최근 모던언어들은 많이 지원을 하나 자바에는 9버전부터 최초로 지원하게 되었습니다.

### 실행방법
자바 설치된 폴더의 bin 디렉터리로 이동합니다. 
저는 mac을 사용하기 때문에 `/Library/Java/JavaVirtualMachines/jdk-9.jdk/Contents/Home/bin`
에 설치되어있습니다.  
해당 폴더안에있는 jshell파일을 실행하면 됩니다.
```
cd $JAVA_HOME/bin
./jshell 
|  Welcome to JShell -- Version 9
|  For an introduction type: /help intro
jshell> _
```
만일 1+1의 결과를 출력하는 Java 코드를 작성한다 가정하면 다음과 같이 코드를 작성해야겠죠.
```java
public class Temp {
    public static void main(String[] args) {
        System.out.println(1 + 1);
    }
}
```
난 그냥 단순히 1+1의 결과만 알고싶은건데 파일도 만들어야 하고 
class이름도 지정해야되고 main method도 작성해야하고 너무 귀찮죠.  
jshell을 쓰면 그냥 화면에 1+1을 치면 됩니다.
```
jshell> 1+1
$1 ==> 2

jshell> $1 + 3 //위에서 연산한 결과를 바로 변수로도 사용가능
$2 ==> 5
```

### 이걸 어디다 써야하나
개발을 할때 잠깐 뭔가 아리까리하니 헷갈리는 코드를 테스트 해볼때 좋습니다.
예를들면 substring같은 아리까리한 끝인덱스 라던지.(설마 나만 헷갈리나?)
```
jshell> "helloworld".substring(5, 10)
$3 ==> "world"
```
숫자 올림이 ceil이였나 floor였나 헷갈리면 그냥 쳐보면 됩니다.
```
jshell> Math.ceil(1.2)
$4 ==> 2.0
```
class하나 만들어서 테스트 하거나 unit 코드 짜서 테스트 하는거보다는 훨씬 편하죠.

### 기본기능
기본적인 package들은 따로 import 하지 않아도 미리 import가 되어있고요 `/imports`명령어로 확인 가능합니다.
(원래 Math를 쓰려면 java.lang.Math 클래스를 import 해야하지만 미리 import되어있기 때문에 따로 하지 않았습니다.)
```
jshell> /imports
|    import java.io.*
|    import java.math.*
|    import java.net.*
|    import java.nio.file.*
|    import java.util.*
|    import java.util.concurrent.*
|    import java.util.function.*
|    import java.util.prefs.*
|    import java.util.regex.*
|    import java.util.stream.*
```
import 되어있지 않으면 그냥 직접 import문을 쳐도 됩니다.
```
jshell> import java.util.concurrent.atomic.*;

jshell> AtomicInteger i = new AtomicInteger(10)
i ==> 10
```

tab키를 누르면 어느정도의 코드 어시스트도 지원합니다.
```
jshell> Math.
E                 IEEEremainder(    PI                abs(              
acos(             addExact(         asin(             atan(             
atan2(            cbrt(             ceil(             class             
copySign(         cos(              cosh(             decrementExact(   
exp(              expm1(            floor(            floorDiv(         
floorMod(         fma(              getExponent(      hypot(            
incrementExact(   log(              log10(            log1p(            
max(              min(              multiplyExact(    multiplyFull(     
multiplyHigh(     negateExact(      nextAfter(        nextDown(         
nextUp(           pow(              random()          rint(             
round(            scalb(            signum(           sin(              
sinh(             sqrt(             subtractExact(    tan(              
tanh(             toDegrees(        toIntExact(       toRadians(        
ulp(              

jshell> Math.
```

method까지 입력했을시 tab을 두번 누르면 해당 method의 document까지 지원합니다.
```
jshell> "helloworld".substring(
String String.substring(int beginIndex)
Returns a string that is a substring of this string.The substring begins with
the character at the specified index and extends to the end of this string.
Examples:
     "unhappy".substring(2) returns "happy"
     "Harbison".substring(3) returns "bison"
     "emptiness".substring(9) returns "" (an empty string)
     

Parameters:
beginIndex - the beginning index, inclusive.

Returns:
the specified substring.

<press tab to see next documentation>
```
다른 다양한 기능들은 `/help`명령어로 확인 가능합니다.

만일 JDK기본 패키지 말고 다른 외부 라이브러리를 쓰고 싶으면 어떡해야 할까요?  
여태까지 보다는 좀 번거로운데 `/env -class-path` 명령어로 외부 라이브러리를 추가해야합니다.
Jsoup으로 Jshell에서 위키피디아를 호출하는 예제입니다.
```
jshell> /env -class-path /Users/me/.m2/repository/org/jsoup/jsoup/1.10.3/jsoup-1.10.3.jar
|  Setting new options and restoring state.

jshell> import org.jsoup.*

jshell> import org.jsoup.nodes.*

jshell> Document doc = Jsoup.connect("http://en.wikipedia.org").get()
doc ==> <!doctype html>
<html class="client-nojs" lang="e ... rdern" title="Jacinda Arde

jshell> doc.title()
$13 ==> "Wikipedia, the free encyclopedia"
```
개인적으론 외부 라이브러리 추가는 조금 다른 방법이 있었으면 좋겠습니다.

그리고 사실 이대로도 좋지만 개인적으로는 Java에도 python의 notenook이나 scalar의 Zeppelin같은
훌륭한 도구가 생겨나지 않을까 하는 희망이 있어서 기대하고 있습니다.
