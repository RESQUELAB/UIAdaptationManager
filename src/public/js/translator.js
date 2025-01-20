/**
 * This file is loaded via the <script> tag in the index.html file
 */
const defaultLang = "es";
const acceptedLang = ["en", "es"];
const texts = {
    /**
     * Put here the translation texts for Muntation Server
     */
    // "": {
    //     "en": "",
    //     "es": ""
    // },
};
let lang = null;

function getLang() {
    if (lang == null) {
        lang = document.body.getAttribute("lang");
        if (lang == null || acceptedLang.indexOf(lang) < 0) {
            lang = defaultLang;
        }
    }
    return lang;
}

function getText(args) {
    args = args.split(":");
    let ret = texts[args[0]][getLang()];
    
    if (args[1]) {
        switch (args[1]) {
            case "1c": // 1st capitalized
                ret = ret.charAt(0).toUpperCase() + ret.slice(1);
                break;
            case "ac": // all capitalized
                ret = ret.toUpperCase();
                break;
        }
    }
    return ret;
}

function translateTexts(l) {
    if (l) {lang = l;}
    let elems = $('[textId]');
    for (let e of elems) {
        e.textContent = getText(e.getAttribute('textId'));
    }
}

translateTexts();