//Gets the version information of the MSIE attribute in the useragent string for the browser
function GetIEVersion() {    
    var versionNumber = "";
    var browserName = navigator.userAgent.toUpperCase();
    if (browserName.indexOf("MSIE") > 0)
    {
        var arrParts = browserName.split(";");            
        for (var iCnt = 0; iCnt < arrParts.length; iCnt++) {
            if (arrParts[iCnt].indexOf("MSIE") > 0) {
                versionNumber = arrParts[iCnt].match("[0-9]");
            }
        }
    }
    return versionNumber;
}

//Gets the version information of the TRIDENT attribute in the useragent string for the browser
function GetTridentVersion()
{    
    var versionNumber = "";
    var browserName = navigator.userAgent.toUpperCase();
    if (browserName.indexOf("TRIDENT") > 0)
    {
        var arrParts = browserName.split(";");
        for (var iCnt = 0; iCnt < arrParts.length; iCnt++) {
            if (arrParts[iCnt].indexOf("TRIDENT") > 0) {
                versionNumber = arrParts[iCnt].match("[0-9]");
            }
        }
    }
    return versionNumber;
}

//Returns boolena value for whther or not to apply the styling to the dropdownlist
function ConfirmApplyStyleForIE() {    
    var result = false;
    
    //Apply styling for the IE browsers
    var browserName = navigator.userAgent.toUpperCase();
    if (browserName.indexOf("MSIE") > 0) {
        if (GetTridentVersion() != "") {
            if (parseInt(GetTridentVersion()) < 5) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
}

function BrowserISIE() {
    var userAgent = navigator.userAgent.toString();
    if (userAgent.indexOf("MSIE") > 0) {
        return true;
    }
    else {
        return false;
    }
}