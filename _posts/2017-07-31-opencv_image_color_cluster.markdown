---
layout: post
category: programming
tags: [opencv]
title:  "opencv로 이미지 컬러 평균 추출하기"
comment : true
---
이번에는 opencv를 이용해서 이미지의 color feature를 추출해보겠습니다. opencv는 매우 강력한 컴퓨터 비전 라이브러리로 이미지나 동영상을 분석 & 수정등이 가능합니다.
opencv는 기본적으로 c++소스로 코드가 짜여있지만 작업의 심플함을 추구하기 위해 python API를 이용해 진행하도록 하겠습니다.

우선 pip를 이용해 opencv를 설치합니다.

```
pip install cv2
```

그리고 python으로 사용할 library를 import합니다. 나머지 라이브러리들이 설치되있지 않다면 마찬가지로 pip나 conda명령어를 이용해 설치해주면 됩니다.
```python
import numpy as np
import cv2
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
```

그리고 읽을만한 샘플 이미지가 필요하겠네요. 저작권 안전한게 뭐가있지..음...구글 로고로 해봅시다.

![]({{site.url}}assets/imgs/opencv/googlelogo_color_272x92dp.png)

```python
image = cv2.imread("/path/to/googlelogo_color_272x92dp.png")
```

이미지를 제대로 로드 했다면 이미지가 어떤 형식으로 데이터가 읽어졌는제 확인 해봅시다.
```python
print(image.shape)
# (92, 272, 3)
```

이미지를 제대로 읽어왔다면 3차원형태의 ndarray가 생성되었을것입니다.
return 되는 숫자의 의미는 (height, width, channel) 값입니다. 여기서 채널은 RGB 3채널을 의미합니다.

추가적으로 주의해야할게 opencv로 이미지를 읽어들이면 RGB순서가 아닌 BGR값으로 리턴이 된다는 것입니다. 헷갈리지 않게 RGB로 데이터를 변경해줍니다.
```python
# 채널을 BGR -> RGB로 변경
image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
```

그리고 차원이 분산되어있어 수치적 계산을 하기가 번거로우니 width와 height를 한개의 array로 통합하겠습니다.
```python
image = image.reshape((image.shape[0] * image.shape[1], 3)) # height, width 통합
print(image.shape)
# (25024, 3)
```

다음으로 scikit-learn의 k-mean 알고리즘으로 이미지를 학습시켜줍니다. k-mean알고리즘은 머신러닝의 비지도 학습중에 가장 일반적인 모델로 k개의 데이터 평균을 만들어 데이터를 clustering하는 알고리즘입니다. 
```python
k = 5 # 예제는 5개로 나누겠습니다
clt = KMeans(n_clusters = k)
clt.fit(image)
```

이제 실제 clustering된 컬러값은 다음처럼 확인 가능합니다.
```python
for center in clt.cluster_centers_:
    print(center)
```

다음의 추가코드로 각컬러의 분율이 얼마나 되는지 확인 가능합니다.
```python
def centroid_histogram(clt):
    # grab the number of different clusters and create a histogram
    # based on the number of pixels assigned to each cluster
    numLabels = np.arange(0, len(np.unique(clt.labels_)) + 1)
    (hist, _) = np.histogram(clt.labels_, bins=numLabels)

    # normalize the histogram, such that it sums to one
    hist = hist.astype("float")
    hist /= hist.sum()

    # return the histogram
    return hist


hist = centroid_histogram(clt)
print(hist)
#[ 0.68881873  0.09307065  0.14797794  0.04675512  0.02337756]
```
실제 function을 호출하면 클러스터 개수의 영역에 얼마만큼의 퍼센테이지가 차지하고 있는지가 return 됩니다.


다음은 추출한 color와 histogram 데이터로 화면에 그래프를 그리는 코드입니다.

```python
def plot_colors(hist, centroids):
    # initialize the bar chart representing the relative frequency
    # of each of the colors
    bar = np.zeros((50, 300, 3), dtype="uint8")
    startX = 0

    # loop over the percentage of each cluster and the color of
    # each cluster
    for (percent, color) in zip(hist, centroids):
        # plot the relative percentage of each cluster
        endX = startX + (percent * 300)
        cv2.rectangle(bar, (int(startX), 0), (int(endX), 50),
                      color.astype("uint8").tolist(), -1)
        startX = endX

    # return the bar chart
    return bar

bar = plot_colors(hist, clt.cluster_centers_)


# show our color bart
plt.figure()
plt.axis("off")
plt.imshow(bar)
plt.show()

```

실제 돌아가는 코드는 [깃헙 노트북 링크](https://github.com/inyl/my_notebook/blob/master/open_cv/image_color_cluster.ipynb)
에서 확인하실 수 있습니다.

해당 포스팅은 [pyimagesearch](http://www.pyimagesearch.com/2014/05/26/opencv-python-k-means-color-clustering/)의 블로그를 참고하여 작성하였습니다.(너무 배꼈다...반성 반성)