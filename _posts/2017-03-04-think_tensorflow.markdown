---
layout: post
category: machine_learning
tags: [tensorflow, machine_leaning]
title:  "Tensorflow로 이미지 분류를 시도 하면서 느낀점"
comment : true
---

최근 회사에서 tensorflow를 Image Classification을 시도해봤는데 개발자로써 느꼈던 점과 약간의 팁아닌 팁을 정리 해봤습니다.<br/>
아직 딥러닝에 대해 조예가 깊지 않아 모르는것도 많고 그냥 개인적인 생각 & 초보팁들이 많이 담겨있습니다.

## 설치
- macos에서 설치를 하고 싶다면 꼭 virtualenv환경에서 세팅하자. 그냥 설치를 시도하면 검색도 잘 안되는 온갖 에러에 휘말릴 수 있는데 macos가 요세미티 이상 넘어오면서 보안을 강화해서 문제가 발생한다. virtualenv환경에서는 딱히 설치에 문제는 없다.
- mac에서 GPU버전 설치하지 말자. 설치도 까다롭고 설치에 성공했다 하더라도 맥의 gpu자체가 구린거 밖에 없고 그나마도 os에서 gpu를 쳐묵쳐묵 하고 있다. 남는 메모리가 사실상 없다. tensorflow 내장 예제도 잘 안돌아가니 그냥 편하게 단념하자.
- GPU를 쓰고 싶다면 CUDA와 cuDNN을 쓸 수 있는 Nvidia제품을 쓰자.
- 리눅스에 GPU버전 설치할때 드라이버 먼저 설치할 필요없다. CUDA 설치할때 친절하게 드라이버도 같이 설치해준다.
- 0.12버전 윈도우 환경기준 3.6버전 파이썬에 tensorflow동작 안함. 나중에 바뀔 수도 있음.
- tensorflow 예제가 bazel로 실행하게 되어있는데 bazel이 디폴트가 python2버전으로 동작하게 되어있다. 만일 pc에 python2와 3가 설치되어있고 python3버전으로 작업하고 싶다면 문제가된다. bazel BUILD파일에 py_binary부분에 default_python_version = "PY3", 를 추가해야 3버전으로 동작한다.

## 학습 (traning)
- gpu연산과 cpu연산은 정말 생각보다 많이 차이난다. 체감으로는 최소 10배이상 차이나는듯. gpu로 테스트 할 수 있는 환경이라면 그냥 gpu버전을 설치를 권장함.
- 연습용으로 사용한다면 생각보다 그리 대단한 그래픽 카드 없어도 된다. 물론 비싼거보단 느리긴 하겠지만 cpu보다는 무조건 낫다. 그냥 gpu메모리 1기가 정도 그래픽 카드여도 충분히 시도할 수 있다. gtx1080이런거 없어도 되니 걱정말고 시도해도 된다.
- 대신 그래픽 카드가 메모리가 낮으면 OOM을 많이 볼텐데 mini batch size를 잘 조절해야한다. 딥러닝에서 학습시킬 데이터가 많아 한번에 연산하는것이 불가능하니 데이터셋을 적절한 수로 잘라 학습 시키는데 그것이 mini batch이다. 가진 gpu가 OOM으로 죽기 직전까지 이 batch size를 최대한 올리자.
- gpu사용시에 nvidia-smi 명령어로 gpu사용량을 체크 가능하다.
- gpu연산은 graph에 최대한 몰빵하고 나머지는 cpu연산으로 처리한다. gpu는 고급인력이기 때문에 정말 중요한 업무만 시켜야한다. 예로 이미지를 리사이즈 하거나 distord 한다던지 하는 작업에 gpu연산을 혹시 쓰고 있지 않은지 잘 체크해봐야한다. 즉 tf.device("gpu:0")설정을 전 영역으로 설정하고 쓰지 말자는 것이다.
- 학습이 길어지면 중간과정을 checkpoint로 저장해야하는데 당연히 저장을 자주 하면 train이 느려질 수 밖에 없음. 파일io를 써야하니깐. 기초적으로는 일정 step마다 저장하는게 일반적이나 이거보다는 여러가지 상황을 체크해 저장하는것이 효과적인것 같음. (1~2epoch이전에 저장하지 않는다던지, 최저 loss 갱신시에만 저장 한다던지)

## 검증 (evaluate)
- 검증은 train과는 별도과정에서 시도하는것이 좋음. 학습 코드에 evaluate코드가 섞여있으면 그만큼 학습 시키는 시간만 증가됨. train에서는 loss까지만 계산하고 train과정에서 떨궈놓은 checkpoint파일을 별도의 장비에서 읽어 검증하는것이 제일 좋고 여건이 안되면 별도의 프로세스에서 실행시켜야함.
- 만일 별도 프로세스로 실행 시킨다면 gpu를 쓰지 않게 설정해야함. 모든 리소스는 training에 올인하고 evaluating은 조금 천천히 해도 상관없지 않나 싶다. gpu버전이 설치됬다면 cpu:0으로 디바이스를 설정해도 gpu 메모리를 쓰려고 하기 때문에 config에 device_count = {'GPU': 0}를 설정하거나 per_process_gpu_memory_fraction 옵션을 설정해서 최저로 값을 낮추는것을 추천.
- 만일 production레벨로 서비스를 한다고 하면 train이 계속 돌면서 checkpoint를 떨궈주고 검증하는 로직은 로직대로 계속 돌면서 accuracy가 일정 수치 (예를들어 90%이상?) 이상이면 해당checkpoint를 백업시키고 그걸 서비스에 deploy시키는 방법으로 개발해야할듯.

## 서비스
- 학습시에 떨궈놓은 checkpoint파일을 restore해서 쓰면 실제 서비스 레벨에서 쓰기엔 속도가 너무 느림. tensorflow에서는 freeze graph라고 weight값을 fix시켜 속도를 향상시킬 수 있음.tensorflow serving도 해당방식임. [해당링크](https://www.tensorflow.org/extend/tool_developers/) 를 참조
- 그냥 일반적인 CNN같은 모듈을 서비스 한다면 [tensorflow serving](https://tensorflow.github.io/serving/)을 이용하는 것이 좋음. 근데 자신만의 비지니스 서비스를 만들어 쓰고 싶다면 글쎄...?


## 기타
- 자신이 일반적인 서비스 모델을 개발하려 한다면 [tensorflow models](https://github.com/tensorflow/models) 프로젝트를 살펴보자. Image Classification, AutoEncoder, Image Captioning, seq-2-seq 모델등 여러가지가 이미 잘 개발 되어있다. 문제는 프로젝트가 release tag를 따지 않아 실제 돌려보면 tensorflow 버전에 따른 무지막지한 에러들을 경험할 수 있으니 마음의 준비를 먼저 하자.
- 그냥 tensorflow를 쓰는거보다 Keras, TF-slim, TFLearn등의 high-level API를 사용하는것이 좋아보인다. tensorflow코드가 워낙 boilerplate코드가 많아 짜놓으면 이게 python으로 짠건지 의구심이 들정도로 지저분 해지는데 Keras같은 high-level API를 이용하면 이런 코드들을 좀 정리할 수 있다.
- tensorflow의 패키지 관리는 정말 엉망이다. 영향력이 있는 프로그램 치고 이렇게 엉망진창인 경우도 드물거같다. 너무 갈아엎다보니 정리가 안돼 split_v2같은 괴랄한 네이밍을 가진 method도 생겨놨다. 오마이갓.. 소스가 엎어진다는건 기존에 나왔던 blog post나 관련 서적들의 코드가 다 무용지물 되는거기 때문에 일반적으론 이런 선택을 피하는데 얘네는 가차없다. 사용소스중에 tf.contrib 안의 소스가 있으면 알아서 마음의 준비를 하고 소스를 미리 백업 해놓자. (1.0이후에는 제발좀 덜 갈아엎길)
- 지네들도 미안한지 1.0 마이그레이션 툴을 제공해준다. [https://www.tensorflow.org/install/migration](https://www.tensorflow.org/install/migration)
- tensorboard를 적극 활용해야한다. tensorflow구조상 개발자에게 익숙한 breakpoint 디버깅이 불가능해 사실상 모니터링 할 수 있는 방법이 얘밖에 없어서 쓰기 싫어도 어쩔 수 없이써야한다. tensorflow를 써야한다면 tensorboard사용법을 필히 익히자.