/*
  Created by Nicholas Amato - 1/13/22
*/

require("dotenv").config();
const cron = require('cron');

//MongoDB Setup
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://pigbot:${process.env.MONGO_PASS}@cluster0.opu0fff.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect();
const db = client.db('pigdb').collection('tokens');


//Initiate Express
const express = require('express');
const app = express();


//Get custom modules and variables
const generateText = require("./custom_modules/generateText");
const getPrompt = require("./custom_modules/getPrompt");
const { response } = require("express");
let isLoggedIn = false;
let ip = '127.0.0.1';
let port = 8000;

//Handle tweet function
async function crontweet(){
  if(isLoggedIn){
    console.log("Loading tweet!");
    const rToken = (await db.find({}, { projection: { refreshToken: 1 } }).toArray())[0].refreshToken;
    
    const {
      client: refreshedClient,
      accessToken,
      refreshToken: newRefreshToken,
    } = await twitterClient.refreshOAuth2Token(rToken);
    
    db.findOneAndUpdate(
      {},
      {$set: {accessToken, refreshToken: newRefreshToken}},
      {returnOriginal: false}
    );
    const prompt = getPrompt()
    const tweet = await generateText(prompt);
    await refreshedClient.v2.tweet(tweet);
    console.log(`Tweet posted at ${new Date()}! Tweet: ${tweet} Prompt: ${prompt}`);
  }
  else{
    console.log("Not logged in! Connect to server and authorize twitter account to tweet.");
  }
  
}
//Define twitter API variables
const clientID = process.env.CLIENT_ID;
const clientSECRET = process.env.CLIENT_SECRET;
const scopes = ["tweet.read", "users.read", "tweet.write", "offline.access"];
const callbackURL = `http://${ip}:${port}/callback`;
const TwitterApi = require('twitter-api-v2').default;
const twitterClient = new TwitterApi({
  clientId: clientID,
  clientSecret: clientSECRET
});

//HTTP Handlers
app.get('/auth', async (req,res) =>{
  if(isLoggedIn){
    res.send("Bot already started! Close instance of bot to re-auth.");
  }
  else{
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    callbackURL,
    { scope: scopes }
  );
  db.findOneAndUpdate(
    {},
    {$set: {code : codeVerifier, st: state}},
    {returnOriginal: false}
  );  
  res.redirect(url);
  }
});


app.get('/callback', async (req,res) =>{
  if(isLoggedIn){
    res.send("Bot already started! Close instance of bot to re-auth.");
  }
  else{
  const { state, code } = req.query;

  console.log(state);

  let codeVerifier = (await db.find({}, { projection: { code: 1 } }).toArray())[0].code;
  let stval = (await db.find({}, { projection: { st: 1 } }).toArray())[0].st;

  if (state !== stval) {
    return res.status(400).send('Stored tokens do not match!');
  }
  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });
  db.findOneAndUpdate(
    {},
    {$set: {accessToken, refreshToken}},
    {returnOriginal: false}
  );  
  const { data } = await loggedClient.v2.me();
  res.redirect(`http://${ip}:${port}/startbot`)
  }
});

//Tells cron it can start running tweet function as all necessary data is available
app.get('/startbot', async (req, res) =>{
  if(isLoggedIn){
    res.send("Bot already started! Close instance of bot to re-auth.");
  }
  else{
    isLoggedIn=true;
    console.log("Succesfully Logged In! Bot will now start running.")
    await crontweet();
    res.send("Bot started!");
  }
});
app.get('/manualtweet', async (req,res) =>{
  if(isLoggedIn){
    res.send("Not logged in");
  }
  else{
    await crontweet();
  }
});




//CRON JOB
const job = new cron.CronJob('15 */2 * * *', async () =>{
  await crontweet();
});
const http = require('http');

http.get('http://checkip.dyndns.org', (res) => {
    res.on('data', (chunk) => {
        console.log(`Your public IP address is: ${chunk}`);
    });
});
//Server start
app.listen(port, ip, () => {
  job.start();
  console.log(`Server listening on port ${port}, with ip address ${ip}`);
  
});





