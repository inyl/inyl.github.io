---
layout: post
categories: jekyll, github
title:  "jekyll로 github page 에 블로그 만들기"
comment : true
---

[카카오 기술 블로그](http://tech.kakao.com/2016/07/07/tech-blog-story/)를 보면서 정말 쓸데없이 Geek스럽다 생각이 들어<br/>
저도 한 번 도전을 해봤는데요 생각보다 어려운 점이 많아 이렇게 포스팅을 하게 되었습니다.<br/>
이런걸 시도하는 사람들은 개발자가 대부분일거라 생각하여 git이나 markdown에 관련된 내용은 생략하겠습니다.<br/>
자신이 그런걸 잘 모른다면 그냥 설치형 블로그를 쓰는것이 심적으로 평온할것이라 판단됩니다 <br/>
저도 이걸 시도하면서 많이 좌절했습니다<br/>
![](http://jjalbox.com/_data/jjalbox/2015/03/92_55169f19d5d14_1833.jpg)

1. Jekyll 설치
  + Jekyll 설정
    [Jekyll]() 설치는 매우 간단합니다.<br/>
    그냥 메인 사이트에 접속해서 메인에 보이는 코드 그대로 입력하시면 됩니다.<br/>
    ![install]({{site.url}}assets/imgs/jekyll1.png)<br/>
    Jekyll이 ruby언어로 개발되어있어 ruby가 설치되어 있어야 하는데<br/>
    mac os의 경우 ruby가 기본적으로 설치되어있어 바로 커맨드를 입력하시면 되고<br/>
    윈도우의 경우에는 루비를 먼저 설치 하시고 그다음에 Jekyll을 설치하시면 됩니다.<br/>
    설치가 끝나면 터미널에<br/>
    
    > Server address: http://127.0.0.1:4000/ <br/>
    > Server running... press ctrl-c to stop.<br/>
        
    와 같은 메시지가 뜨고 [](http://localhost:4000/) 으로 접속하면 휑한 페이지가 뜨는 것을 볼 수 있습니다.<br/>
    사이트가 정상적으로 뜬다면 설치에 성공하셨습니다. 축하드립니다.
    이후에는 그냥 "jekyll s" 같이 간단하게 서버를 로컬에 기동할 수 있습니다.
  + config설정
    설정이 제대로 되었다면 폴더안에 _config.yml파일이 생성되었을텐데 사이트의 기본 설정값이 저장 되어있습니다.<br/>

    {% highlight yml %}
    title: #사이트 명
    email: #자신의 이메일
    description: > # 자신의 사이트 설명. 주로 copyright
      © 2016 inyl.
    url: "https://inyl.github.io/" # the base hostname & protocol for your site
    #twitter_username: jekyllrb
    github_username:  #자신의 github id
    {% endhighlight %}
  + 적당히 변경할 만한 값은 이정도 인데<br/>
    이곳에 자신이 custom하게 변수를 설정할 수도 있습니다.
  + 포스팅 작성
    포스팅은 폴더에 _posts폴더에 "yyyy-MM-dd-title.markdown" 파일 이름의 형식으로<br/>
    markdown파일형식을 만들면 포스팅이 된것입니다.<br/>
    markdown엔진은 기본으로 kramdown을 사용하는데 레퍼런스는 [](http://kramdown.gettalong.org/quickref.html)를 참조하시면 됩니다
        
3. Github Page 생성
  git 생성은 github에 로그인 한다음에 [New Repository메뉴](https://github.com/new) 에서 repository를 생성하시면 되는데<br/>
  이때 주의해야할점은 repository의 이름을 {github계정}.github.io로 입력하셔야 한다는 것입니다<br/>
  자신의 계정이 abcd라면 abcd.github.io로 설정하시면 됩니다.<br/>
  그다음에 로컬에 소스를 서버로 commit & pull하시면 됩니다.<br/>
  다른 문서의 경우 gh-pages 브랜치에서 작업하라고 명시되어 있는 문서도 있으나 저의 경우 master브랜치에다 pull하여도<br/>
  사이트가 동작하는 것을 확인할 수 있었습니다.
  * Page build failure 오류 발생경우
    pull까지는 성공했는데 github에서<br/>
      
    > Your SCSS file `css/main.scss` has an error on line 40: File to import not found or unreadable: minima/base. Load path: _sass. For more information, see https://help.github.com/articles/page-build-failed-invalid-sass-or-scss.
        
    같은 오류가 났다고 메일이 올 수 있는데, (솔직히 짜증나서 여기서 그만두고 싶었...)<br/>
    jekyll에서 버전업을 하면서 테마를 gem으로 install하는 방식, <br/>
    즉 테마파일을 외부에서 다시 받아서 빌드하는 방식으로 변경하였는데<br/>
    github page에서는 이 기능을 지원하지 않아 오류가 발생하는 것입니다.<br>
        
    Jekyll을 최초 설치하면 기본 테마는 minima란 테마로 설정되어있고 해당 파일은<br/>
    [](https://github.com/jekyll/minima) 여기에 올라가 있습니다.
    여기의 파일을 받아 스킨 관련된 폴더(_sass, _layouts, _includes) 폴더를 카피해서 내 블로그 폴더로 복사한다음에 github에 pull하시면 됩니다.

4. 뽀나스 disqus댓글 설정
  jekyll이 DB를 이용하지 않아 설치형블로그나 서비스 블로그에 비해 정말 아무것도 없다시피 한데<br/>
  댓글은 disqus라는 서비스로 쉽게 붙일 수 있습니다.<br/>
  [disqus](https://disqus.com) 사이트에 접속해서 회원가입을 마치고<br/> 
  [create](https://disqus.com/admin/create/) 메뉴에서 댓글을 생성할 사이트 정보를 입력합니다.<br/>
  ![]({{site.url}}assets/imgs/jekyll2.png) <br/>
  사이트 생성은 워낙 심플해서 website name에는 내 github page주소를 입력하고 카테고리는 적절히 선택한다음에 생성하시면 됩니다.<br/>
  생성이 끝났으면 disqus사이트가 메뉴가 아주 뒤죽박죽인데<br/>
  [이곳](https://disqus.com/admin/install/platforms/universalcode/)에 접속해서 나오는 스크립트를 복사해 내 템플릿에 붙여넣으면 됩니다.<br/>
  만일 기본인 minima 템플릿을 쓴다면 _layouts/post.html에 스크립트를 넣으면 되고<br/>
  다른 theme를 사용중이면 포스트 화면의 html에 코드를 넣으시면 됩니다.
    
근데 막상 해보면 서버 올렸을때 막 틀어지기도 하고 노력이 너무 많이 들어가네요.<br/>
진정한 Geek아니면 사용은 비추 드립니다.