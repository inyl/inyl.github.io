---
layout: post
category: programming
tags: [macos]
title:  "macos crontab이 동작하지 않을때"
comment : true
---
macos가 El Capitan이후로 보안이 강화되어 `crontab -e` 로 cron을 설정해도 동작하지가 않는다.

해결방법은 `sudo vi /var/at/cron.allow` 명령어를 치고 자신의 username을 적어넣고 저장한다.