---
layout: post
category: programming
tags: [json, typescript]
title:  "json 파일을 import하니 값이 사라졌어요"
comment : true
thumbnail: https://source.unsplash.com/HfFoo4d061A/846x343
---

다국어 지원을 위해 다국어 text를 json파일로 만들고 import를 합니다
```json
{
  "foo": "bar",
  "sample.text": "hello world",
  "sample_text": "hello_world"
}
```
```javascript
function getLocaleMessage(locale) {
    if (locale === 'ko') {
        return import('intl/ko.json')
    }
    
    return import('intl/en.json')
}
```
```javascript
const locale = navigator.language
const messages = await getLocaleMessage(locale)
// 중간생략
const intl = createIntl({
    locale: locale
    messages: messages
})
```
근데 이상하게 메시지를 쓸수가 없어서 내가 코딩을 잘못했나 찾아보고 사용하고 있는 FormatJs 설정을 잘못했는지 디버깅을 해봤는데
이상하게 키에 점이 붙어있는 케이스만 메시지를 로드할 수 없는것이었습니다.

```javascript
const messages = await getLocaleMessage(locale)
messages['foo'] // 잘나옴
messages['sample_text'] // 역시 잘나옴
messages['sample.text'] // undefined ????????
```

좀 더 디버깅을 해보니 이는 FormatJs의 문제는 아니였고 import 구문으로 json파일을 import하자마자 키가 사라지는 것이었습니다.

확인해보니 json파일을 import('file.json') 형식으로 사용할때 원래 json값을 그대로 사용하지 않고 모듈 형식으로 변환을 하게됩니다
```javascript
// 이런 json 파일이 있다면
{
  "foo": "bar",
  "sample.text": "hello world",
  "sample_text": "hello_world"
}

// 이렇게 변환이 됨
export const foo = "bar"
export const sample_text = "hello_world"
export default {
  "foo" : foo,
  "sample.text": "hello world",
  "sample_text": sample_text
}

```
json key에 dot이 없는경우는 그냥 그대로 사용할수 있게 모듈 변환이 되는데 dot이 포함되는 경우는 default하위에서 접근하게 변경이 됩니다
따라서
```javascript
message.default['hello.world'] 
```
로 접근해야 됩니다. intl을 생성할때도
```javascript
const messages = await getLocaleMessage(locale)

const intl = createIntl({
    locale: locale
    messages: messages.default // default를 등록.
})
```

뭔가 별거 아닌데 이상하게 삽질해서 끄적끄적...
