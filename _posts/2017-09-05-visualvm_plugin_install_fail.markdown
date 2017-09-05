---
layout: post
category: programming
tags: [java]
title:  "VisualVM Plugin install 실패할때"
comment : true
---
Java JDK에 기본적으로 내장되어있는 VisualVM은 자바 메모리와 thread를 모니터링 하기에 매우 좋은 툴입니다.

게다가 다양한 plugin도 있어 다른 기능을 더 추가시킬 수 있기도 한데 이게 어느순간부터 503에러가 발생하며 플러그인이 설치가 안되었습니다.

업데이트 서버 url이 중지되서 그런건데요 <s>(장하다 오라클)</s>

VisualVM을 실행하고 상단메뉴의 Tools -> Plugins -> Settings 메뉴에서 기존에 있던 `Java VisualVM Plugins Center`URL을

[여기를 접속](https://visualvm.github.io/pluginscenters.html)하셔서 자신의 JDK 버전에 맞는 URL로 변경하시면 됩니다.

![]({{site.url}}assets/imgs/visualvm/visualvm1.png)