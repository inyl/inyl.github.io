---
layout: post
category: programming
tags: [java, stream]
title:  "webpack2 babel로 브라우저 호환성 설정하기"
comment : true
---
회사에서 es2016을 써보고 싶어서 조그만한 프로젝트에다가 webpack2랑 babel을 설정 했었습니다.

```js
var webpack = require('webpack');

... // 생략

module: {
    rules: [
        {
            test: /\.css$/,
            loader: "style-loader!css-loader"
        },
        {
            test: /\.js?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: {
                presets: ['es2016']
            }
        }
    ]
}
```

이렇게 설정하고 아무 생각없이 쓰고 있었는데 사실 이건 제 기준에서 잘못된 설정이었습니다.
es2016과 호환되는 코드를 쓰고 싶었는데 es2016 코드가 그대로 bundle로 떨궈졌습니다.
당연히 낮은 버전의 브라우저에선 동작하지 않겠죠.

그냥 es2016을 쓰려면 es2016으로 설정하면 되겠거니 하는 단세포적인 안일함에서 나온 실수였습니다.

낮은 브라우저와 호환성을 설정하려면 [babel-env preset](http://babeljs.io/docs/plugins/preset-env/)을 사용해야 합니다.

사실 babel을 쓰는 이유는 높은 es버전의 스크립트를 버전이 낮은 브라우저에도 보이게 하려는 목적이 크다고 생각됩니다.
그럼 제일 문제가 되는 <s>악의축인</s> IE로 예제를 진행 하겠습니다.

우선 env preset을 install합니다.
```
npm install --save-dev babel-preset-env
```

webpack2의 config를 다음과 같이 설정합니다.
```js
module: {
    rules: [
        {
            test: /\.css$/,
            loader: "style-loader!css-loader"
        },
        {
            test: /\.js?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: {
                presets: [['env',{
                    "targets": {"ie": 8}
                }]]
            }
        }
    ]
}
```
presets의 targets을 보면 `{"ie": 8}` 로 맞춰줬습니다.
즉 최신코드는 그냥 다 안된다는 거죠.
브라우저를 기준으로 preset을 설정하기 때문에 정확히 어떤 코드가 적용되었는지 잘 모를수 있습니다.
`debug:true` 옵션을 주면 어떤 transform이 적용되었는지 자세하게 찍어줍니다.
```js
module: {
    rules: [
        {
            test: /\.css$/,
            loader: "style-loader!css-loader"
        },
        {
            test: /\.js?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            query: {
                presets: [['env',{
                    "targets": {"ie": 8},
                    "debug": true
                }]]
            }
        }
    ]
}
```
이런식으로 어떤 transform이 적용되었는지 보여줍니다.
```
Using targets:
{
  "ie": 8
}

Modules transform: commonjs

Using plugins:
  check-es2015-constants {"ie":8}
  transform-es2015-arrow-functions {"ie":8}
  transform-es2015-block-scoped-functions {"ie":8}
  transform-es2015-block-scoping {"ie":8}
  transform-es2015-classes {"ie":8}
  transform-es2015-computed-properties {"ie":8}
  transform-es2015-destructuring {"ie":8}
  transform-es2015-duplicate-keys {"ie":8}
  transform-es2015-for-of {"ie":8}
  transform-es2015-function-name {"ie":8}
  transform-es2015-literals {"ie":8}
  transform-es2015-object-super {"ie":8}
  transform-es2015-parameters {"ie":8}
  transform-es2015-shorthand-properties {"ie":8}
  transform-es2015-spread {"ie":8}
  transform-es2015-sticky-regex {"ie":8}
  transform-es2015-template-literals {"ie":8}
  transform-es2015-typeof-symbol {"ie":8}
  transform-es2015-unicode-regex {"ie":8}
  transform-regenerator {"ie":8}
  transform-exponentiation-operator {"ie":8}
  transform-async-to-generator {"ie":8}
  syntax-trailing-function-commas {"ie":8}
```
테스트를 해볼겸 es2017의 async, await기능을 써보겠습니다.
```js
async function test(){
    const aa = await "hello world";
    console.info(aa);
}
test();
```
빌드후에 스크립트를 봐보겠습니다.
```js
var test = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var aa;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return "hello world";

                    case 2:
                        aa = _context.sent;

                        console.info(aa);

                    case 4:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function test() {
        return _ref.apply(this, arguments);
    };
}();

test();
```

제가 작성한 async, await코드가 변환된것을 확인 가능합니다.
preset을 es2015로 놓고 하나하나 transform을 추가해서 호환성을 맞출 수도 있지만
이런식으로 세팅하면 훨씬 간결하고 편한 설정이 됩니다.

polyfill을 맞출때도 간단하게 config에 `"useBuiltIns" : true`를 설정하면 됩니다.
우선 `babel-polyfill`을 npm에 install합니다. 실제 script에 import하기 때문에 save-dev로 저장하지 않습니다.
```
npm install babel-polyfill --save
```
그리고 js파일에 import하면 됩니다.
```js
import "babel-polyfill"
```

그리고 config에 `"useBuiltIns" : true`를 추가해줍니다. 마찬가지로 debug옵션이 켜져있으면 어떤 코드가 polyfill로 추가되었는지 확인 가능합니다.
```js
presets: [['env',{
    "targets": {"ie": 8},
    "debug": true,
    "useBuiltIns" : true // polyfill
}]]
```


이것 말고 여러 옵션들이 더 많이 존재하니 [preset-env](http://babeljs.io/docs/plugins/preset-env/#examples)링크를 참조하시면 될것 같습니다.
