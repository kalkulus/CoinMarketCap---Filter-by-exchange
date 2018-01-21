var jsInitChecktimer = setInterval (checkForJS_Finish, 111);
function checkForJS_Finish () {
    if (document.querySelector (".dataTable")) {
        clearInterval (jsInitChecktimer);
        cmcEf.init();
    }
}