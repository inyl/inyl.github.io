---
layout: post
category: programming
tags: [java, stream]
title:  "Java Stream API는 과연 빠를까?"
comment : true
---
시작하기 앞서 이 테스트는 머신의 상황, JDK 버전, 테스트 방식별로 차이가 있을수 있으며 이 테스트 방식이 절대적이지는 않습니다.

java8 버전에서 많은 사람들이 알다시피 Stream API가 생겼습니다.
Stream API는 많은 양의 데이터를 일괄적으로 처리하고 가독성 좋은 코드를 만드는데 유용합니다.
stream은 일반적으로 단방향읽기와 1회 읽기만 가능합니다. 
그래서 기본적으로 빠를거라 예상할 수 있습니다.
File도 StreamReader가 일반적으로 더 빠르기도 하고요.

그럼 간단한 예제 코드와 측정을 통해서 한 번 시험 해보도록 하겠습니다.
제대로 된 성능 테스트를 위해 저는 [JMH](http://openjdk.java.net/projects/code-tools/jmh/)를 사용하겠습니다.
JMH는 OpenJDK에서 만든 micro benchmark 모듈입니다.
간단한 코드로 디테일한 여러가지 부하 테스팅이 가능한 유용한 모듈입니다.

우선 간단한 maven project를 만듭니다.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>aaa</groupId>
    <artifactId>jmh</artifactId>
    <version>1.0-SNAPSHOT</version>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <source>1.8</source>
                    <target>1.8</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <jmh.version>1.19</jmh.version>
        <javac.target>1.8</javac.target>
        <uberjar.name>benchmarks</uberjar.name>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-core</artifactId>
            <version>${jmh.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjdk.jmh</groupId>
            <artifactId>jmh-generator-annprocess</artifactId>
            <version>${jmh.version}</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>
</project>
```
그리고 간단히 1부터 10000까지 데이터를 더하는 테스트 method를 만들겠습니다.
하나는 일반적인 for문. 하나는 Stream API를 이용한 sum입니다.

```java
package com.inyl;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Measurement;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.annotations.Warmup;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

@State(Scope.Benchmark)
@BenchmarkMode({Mode.SampleTime})
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@Warmup(iterations=1)
@Measurement(iterations=1, time=5)
public class StreamBenchmark {
	int SIZE = 10000;

	int[] intArr;
	
	@Setup
	public void setup() throws InterruptedException {
	    // bench전에 데이터를 init한다.
		this.intArr = IntStream.range(1, SIZE).toArray();
	}

	@Benchmark
	public void normal() {
		int sum = 0;
		int arrSize = intArr.length;
		for (int i = 0; i < arrSize; i++) {
			sum += intArr[i];
		}
		System.out.println("test normal for " + sum);
	}

	@Benchmark
	public void streamSum() {
		int sum = IntStream.range(1, SIZE).sum();
		System.out.println("stream normal " + sum);
	}

    public static final void main(String[] args) throws RunnerException {
        Options opt = new OptionsBuilder()
                .include(StreamBenchmark.class.getSimpleName())
                .build();

        new Runner(opt).run();
    }
}
```
위 예제는 5초안에 얼마나 많은 sample을 실행시키냐로 통계를 내게 됩니다. `@BenchmarkMode({Mode.SampleTime})`를 조절하면 다른 모드로도 통계를 낼 수 있습니다.
5초라고 설정하긴 했는데 실제로 Fork옵션을 주지 않으면 실제로 10회정도 테스트를 실행합니다. 
그리고 최초 실행이 이후실행보다 속도가 지연될 수 있으므로 @Warmup 으로 먼저 로직을 달궈놓고(?) 테스트를 진행했습니다.

```
Benchmark                                      Mode      Cnt    Score    Error  Units
StreamBenchmark.normal                       sample  1107837    0.014 ±  0.001  ms/op
StreamBenchmark.normal:normal·p0.00          sample             0.006           ms/op
StreamBenchmark.normal:normal·p0.50          sample             0.008           ms/op
StreamBenchmark.normal:normal·p0.90          sample             0.017           ms/op
StreamBenchmark.normal:normal·p0.95          sample             0.025           ms/op
StreamBenchmark.normal:normal·p0.99          sample             0.054           ms/op
StreamBenchmark.normal:normal·p0.999         sample             0.471           ms/op
StreamBenchmark.normal:normal·p0.9999        sample             5.942           ms/op
StreamBenchmark.normal:normal·p1.00          sample           173.015           ms/op
StreamBenchmark.streamSum                    sample   666920    0.039 ±  0.001  ms/op
StreamBenchmark.streamSum:streamSum·p0.00    sample             0.007           ms/op
StreamBenchmark.streamSum:streamSum·p0.50    sample             0.034           ms/op
StreamBenchmark.streamSum:streamSum·p0.90    sample             0.051           ms/op
StreamBenchmark.streamSum:streamSum·p0.95    sample             0.062           ms/op
StreamBenchmark.streamSum:streamSum·p0.99    sample             0.117           ms/op
StreamBenchmark.streamSum:streamSum·p0.999   sample             0.680           ms/op
StreamBenchmark.streamSum:streamSum·p0.9999  sample             4.330           ms/op
StreamBenchmark.streamSum:streamSum·p1.00    sample            25.854           ms/op
```

실제로 stream이 일반적인 for문보다 거의 60%가량으로 떨어지는 테스트 결과가 나왔습니다.
너무 테스트 사이즈가 작았던 결과였을까요? 테스트 array의 size를 100000 으로 변경해보고 테스트 해보겠습니다.

```
Benchmark                                      Mode     Cnt   Score   Error  Units
StreamBenchmark.normal                       sample  588552   0.047 ± 0.001  ms/op
StreamBenchmark.normal:normal·p0.00          sample           0.033          ms/op
StreamBenchmark.normal:normal·p0.50          sample           0.039          ms/op
StreamBenchmark.normal:normal·p0.90          sample           0.059          ms/op
StreamBenchmark.normal:normal·p0.95          sample           0.070          ms/op
StreamBenchmark.normal:normal·p0.99          sample           0.127          ms/op
StreamBenchmark.normal:normal·p0.999         sample           0.607          ms/op
StreamBenchmark.normal:normal·p0.9999        sample           3.535          ms/op
StreamBenchmark.normal:normal·p1.00          sample          54.985          ms/op
StreamBenchmark.streamSum                    sample  158300   0.315 ± 0.003  ms/op
StreamBenchmark.streamSum:streamSum·p0.00    sample           0.258          ms/op
StreamBenchmark.streamSum:streamSum·p0.50    sample           0.289          ms/op
StreamBenchmark.streamSum:streamSum·p0.90    sample           0.356          ms/op
StreamBenchmark.streamSum:streamSum·p0.95    sample           0.397          ms/op
StreamBenchmark.streamSum:streamSum·p0.99    sample           0.644          ms/op
StreamBenchmark.streamSum:streamSum·p0.999   sample           2.995          ms/op
StreamBenchmark.streamSum:streamSum·p0.9999  sample          11.557          ms/op
StreamBenchmark.streamSum:streamSum·p1.00    sample          67.240          ms/op
```

편차가 더 벌어졌습니다. 아 Stream은 많은 데이터 처리를 위해 parallel 옵션을 제공하고 있지요. 아무래도 나눠서 하면 더 빠르지 않을까요?
한번 parallel 옵션을 추가하고 다시 테스트 해봅시다.
```java
@Benchmark
public void streamSumParallel() {
    int sum = IntStream.range(1, SIZE).parallel().sum();
    System.out.println("stream parallel " + sum);
}
```
```
StreamBenchmark.normal                                       sample  731001   0.052 ± 0.001  ms/op
StreamBenchmark.normal:normal·p0.00                          sample           0.033          ms/op
StreamBenchmark.normal:normal·p0.50                          sample           0.039          ms/op
StreamBenchmark.normal:normal·p0.90                          sample           0.065          ms/op
StreamBenchmark.normal:normal·p0.95                          sample           0.080          ms/op
StreamBenchmark.normal:normal·p0.99                          sample           0.156          ms/op
StreamBenchmark.normal:normal·p0.999                         sample           1.098          ms/op
StreamBenchmark.normal:normal·p0.9999                        sample           6.332          ms/op
StreamBenchmark.normal:normal·p1.00                          sample          33.817          ms/op
StreamBenchmark.streamSum                                    sample  165443   0.302 ± 0.001  ms/op
StreamBenchmark.streamSum:streamSum·p0.00                    sample           0.260          ms/op
StreamBenchmark.streamSum:streamSum·p0.50                    sample           0.288          ms/op
StreamBenchmark.streamSum:streamSum·p0.90                    sample           0.344          ms/op
StreamBenchmark.streamSum:streamSum·p0.95                    sample           0.372          ms/op
StreamBenchmark.streamSum:streamSum·p0.99                    sample           0.484          ms/op
StreamBenchmark.streamSum:streamSum·p0.999                   sample           1.180          ms/op
StreamBenchmark.streamSum:streamSum·p0.9999                  sample           3.597          ms/op
StreamBenchmark.streamSum:streamSum·p1.00                    sample          20.349          ms/op
StreamBenchmark.streamSumParallel                            sample  365577   0.136 ± 0.001  ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.00    sample           0.027          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.50    sample           0.141          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.90    sample           0.205          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.95    sample           0.231          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.99    sample           0.348          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.999   sample           0.742          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p0.9999  sample           3.312          ms/op
StreamBenchmark.streamSumParallel:streamSumParallel·p1.00    sample          37.159          ms/op
```
parallel이 붙은게 조금 더 높게 나왔지만 역시 기본 for문을 넘기는 어려웠습니다.
그리고 신기한건 .sum()을 쓰는거보다 그냥 reduce로 데이터를 합치는게 속도가 훠얼씬~ 더 잘나옵니다. 
실제 sum method 내부를 보면 그냥 reduce를 호출하는데 말입니다.
```java
@Benchmark
public void streamReduceParallel() {
    int sum = IntStream.range(1, SIZE).reduce((a, b) -> a + b).getAsInt();
    System.out.println("reduce " + sum);
}
```

```
Benchmark                                            Mode     Cnt   Score   Error  Units
StreamBenchmark.streamReduce                       sample  481988   0.104 ± 0.001  ms/op
StreamBenchmark.streamReduce:streamReduce·p0.00    sample           0.063          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.50    sample           0.083          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.90    sample           0.123          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.95    sample           0.270          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.99    sample           0.312          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.999   sample           0.413          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.9999  sample           1.539          ms/op
StreamBenchmark.streamReduce:streamReduce·p1.00    sample          47.645          ms/op
StreamBenchmark.streamSum                          sample  168366   0.296 ± 0.001  ms/op
StreamBenchmark.streamSum:streamSum·p0.00          sample           0.256          ms/op
StreamBenchmark.streamSum:streamSum·p0.50          sample           0.286          ms/op
StreamBenchmark.streamSum:streamSum·p0.90          sample           0.333          ms/op
StreamBenchmark.streamSum:streamSum·p0.95          sample           0.357          ms/op
StreamBenchmark.streamSum:streamSum·p0.99          sample           0.433          ms/op
StreamBenchmark.streamSum:streamSum·p0.999         sample           0.967          ms/op
StreamBenchmark.streamSum:streamSum·p0.9999        sample           5.140          ms/op
StreamBenchmark.streamSum:streamSum·p1.00          sample          12.648          ms/op
```
그리고 이 reduce함수에는 parallel을 걸면 오히려 더 성능이 느려집니다.(?)
```
Benchmark                                                            Mode     Cnt   Score    Error  Units
StreamBenchmark.streamReduce                                       sample  480013   0.104 ±  0.001  ms/op
StreamBenchmark.streamReduce:streamReduce·p0.00                    sample           0.064           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.50                    sample           0.084           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.90                    sample           0.125           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.95                    sample           0.268           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.99                    sample           0.316           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.999                   sample           0.496           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.9999                  sample           2.130           ms/op
StreamBenchmark.streamReduce:streamReduce·p1.00                    sample          14.107           ms/op
StreamBenchmark.streamReduceParallel                               sample  428678   0.116 ±  0.001  ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.00    sample           0.038           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.50    sample           0.111           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.90    sample           0.184           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.95    sample           0.211           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.99    sample           0.307           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.999   sample           0.638           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p0.9999  sample           2.746           ms/op
StreamBenchmark.streamReduceParallel:streamReduceParallel·p1.00    sample          21.758           ms/op
StreamBenchmark.streamSum                                          sample  164139   0.304 ±  0.001  ms/op
StreamBenchmark.streamSum:streamSum·p0.00                          sample           0.259           ms/op
StreamBenchmark.streamSum:streamSum·p0.50                          sample           0.286           ms/op
StreamBenchmark.streamSum:streamSum·p0.90                          sample           0.345           ms/op
StreamBenchmark.streamSum:streamSum·p0.95                          sample           0.378           ms/op
StreamBenchmark.streamSum:streamSum·p0.99                          sample           0.537           ms/op
StreamBenchmark.streamSum:streamSum·p0.999                         sample           2.128           ms/op
StreamBenchmark.streamSum:streamSum·p0.9999                        sample           8.010           ms/op
StreamBenchmark.streamSum:streamSum·p1.00                          sample          26.903           ms/op
```
데이터 size를 더 늘려서 계속 테스트 해볼수도 있겠으나 데이터의 사이즈가 더 커진다면 일반적으로는 편의상 spark같은 외부의 다른 모듈을 이용할거기 때문에

물론 테스트 한것은 지극히 단순한 sum하는 모델이라 복잡한 로직에서는 반대의 결과가 나올지 모르지만 심플한 연산모델에서 굳이
데이터를 stream로 변환하여 연산 할 필요는 없을거 같습니다.
추가로 그럼 rxjava로 해보면 어떨까요? 벤치마크로 추가 해봅시다.
```java
@Benchmark
public void rxjavaSum() {
    int sum = Flowable.range(1, SIZE).reduce((a, b) -> a+b).blockingGet();
    System.out.println("rxjava reduce " + sum);
}
```
```
Benchmark                                            Mode     Cnt   Score    Error  Units
StreamBenchmark.rxjavaSum                          sample   67619   0.738 ±  0.004  ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.00          sample           0.572           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.50          sample           0.658           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.90          sample           0.868           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.95          sample           1.034           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.99          sample           2.091           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.999         sample           4.323           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.9999        sample          11.033           ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p1.00          sample          22.905           ms/op
StreamBenchmark.streamReduce                       sample  481333   0.104 ±  0.001  ms/op
StreamBenchmark.streamReduce:streamReduce·p0.00    sample           0.063           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.50    sample           0.082           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.90    sample           0.126           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.95    sample           0.271           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.99    sample           0.312           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.999   sample           0.420           ms/op
StreamBenchmark.streamReduce:streamReduce·p0.9999  sample           1.182           ms/op
StreamBenchmark.streamReduce:streamReduce·p1.00    sample          20.513           ms/op
```
성능이 Stream API 보다 한참 떨어지네요. 물론 rxjava가 느리니까 구려!라는것은 아닙니다. 
rxjava는 더 많은 기능들을 수용하고 있으니 상황에 맞게 쓰면 될것 같습니다. 
대신 별거 없는 연산에 적용한다면 속도가 많이 떨어지는 것은 충분히 감안을 해야할것 같습니다.
rxjava도 parallel환경을 한 번 테스트 해봐야겠죠.
```java
@Benchmark
public void rxjavaSumParallel() {
    Flowable.range(1, SIZE).parallel().reduce((a, b) -> a+b).blockingSubscribe(sum -> System.out.println("rxjava parallel" + sum));
}
```
```
Benchmark                                                      Mode     Cnt   Score   Error  Units
StreamBenchmark.rxjavaSum                                    sample   60541   0.823 ± 0.007  ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.00                    sample           0.577          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.50                    sample           0.722          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.90                    sample           0.967          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.95                    sample           1.499          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.99                    sample           2.376          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.999                   sample           4.749          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p0.9999                  sample          14.023          ms/op
StreamBenchmark.rxjavaSum:rxjavaSum·p1.00                    sample          48.103          ms/op
StreamBenchmark.rxjavaSumParallel                            sample   37603   1.327 ± 0.005  ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.00    sample           1.100          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.50    sample           1.251          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.90    sample           1.452          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.95    sample           1.708          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.99    sample           2.773          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.999   sample           3.953          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p0.9999  sample           7.052          ms/op
StreamBenchmark.rxjavaSumParallel:rxjavaSumParallel·p1.00    sample           8.634          ms/op
StreamBenchmark.streamReduce                                 sample  471487   0.106 ± 0.001  ms/op
StreamBenchmark.streamReduce:streamReduce·p0.00              sample           0.063          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.50              sample           0.088          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.90              sample           0.121          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.95              sample           0.269          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.99              sample           0.330          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.999             sample           0.815          ms/op
StreamBenchmark.streamReduce:streamReduce·p0.9999            sample           4.669          ms/op
StreamBenchmark.streamReduce:streamReduce·p1.00              sample          21.004          ms/op
```
더 떨어지네요. Scheduler도 변경해보고 Observable로도 테스트 해보긴 했는데 Bench를 뒤집을 만큼의 결과는 나오지 않아 생략했습니다.


### 결론 
물론 계속 언급했듯이 Stream API나 rxjava는 단순히 데이터를 더하기 위해서만 사용하는 것은 아닙니다. 
하지만 굳이 큰 용도가 아닌데 최신기술은 무조건 좋겠지 하는 생각으로 도입하는것보다 
기술을 도입할때는 정말 내가 필요한가, 이게 확실한 최선의 방식인가를 
먼저 요밀조밀 잘 따져보고 테스트 후에 도입을 시도 해보는것이 좋은 방법일것 같습니다.
 