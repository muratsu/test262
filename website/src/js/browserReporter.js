var state = {
    pass: 0,
    fail: 0,
}

function expectedString(test) {
    if(!test.attrs.negative) {
        return "no error";
    } else {
        return "error matching /" + test.attrs.negative + "/";
    }
}

function actualString(test) {
    if(test.errorStack) {
        return test.errorStack
                   .split("\n")
                   .map(function(v) { return "       " + v.trim()})
                   .join("\n")
                   .trim();
    } else if(test.errorName) {
        if(test.errorMessage) {
            return test.errorName + ": " + test.errorMessage;
        } else {
            return test.errorName;
        }
    } else {
        return "no error"
    }
}

module.exports = function(data) {
    if(data.pass) {
        state.pass++;
        console.log("PASS " + data.file);
    } else {
        state.fail++;
        data.attrs.file = data.file;
        console.log("FAIL " + data.file + "\n" +
                             "     " + (data.attrs.description || "").trim() + "\n" +
                             "     Exp: " + expectedString(data) + "\n" +
                             "     Got: " + actualString(data) + "\n\n");
    }
};
