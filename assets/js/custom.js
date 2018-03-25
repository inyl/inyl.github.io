function searchByGoogle(word) {
    if (!word) {
        return;
    }
    var query = "site:inyl.github.io " + encodeURIComponent(word);
    window.open("https://google.co.kr/search?q=" + query);
}