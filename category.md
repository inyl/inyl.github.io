---
layout: page
title: Categories
permalink: /category/

---
{% for cate in site.categories %}
* [{{ cate[0] }}]({{ site.baseurl }}/{{ cate[0] }})
{% endfor %}