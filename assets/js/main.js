jQuery(document).ready(function($) {

    $('.level-bar-inner').css('width', '0');
    
    $(window).on('load', function() {

        $('.level-bar-inner').each(function() {
        
            var itemWidth = $(this).data('level');
            
            $(this).animate({
                width: itemWidth
            }, 800);
            
        });

    });
    function searchByGoogle(word) {
        if (!word) {
            return;
        }
        var query = "site:inyl.github.io " + encodeURIComponent(word);
        window.open("https://google.co.kr/search?q=" + query);
    }

    $("#btnGoogleSearch").click(function(){
        searchByGoogle($("#txtGoogleSearch").val());
    });

    $("#txtGoogleSearch").keydown(function (e) {
        if (e.which === 13) {
            searchByGoogle($("#txtGoogleSearch").val());
        }
    });
});