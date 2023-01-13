const fs = require('fs');
const { builtinModules } = require('module');
const path = require('path');
let filePath = path.join(__dirname, '..', 'prompts.txt');
let prompts = fs.readFileSync(filePath, 'utf8');

function getPrompt(){
    let arr = prompts.split(',');
    let prompt = arr[Math.floor(Math.random() * arr.length)];
    return prompt;
}

module.exports = getPrompt;