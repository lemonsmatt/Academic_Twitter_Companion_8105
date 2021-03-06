//database connection
var mongoose = require('mongoose');
mongoose.connect('mongodb+srv://matt:msl@academictwitter-nlieo.mongodb.net/test?retryWrites=true').then(() => {
    console.log('connected');
}).catch(err => console.log(err));
//database models
var TweetModel = require("../models/tweet.js");
var SectionModel = require("../models/section.js");

var async = require("async");
var Twitter = require('twitter');
var config = require('./config.js');
var request = require('request');
var T = new Twitter(config);

//find all of the hashtags in the database
SectionModel.find({}, 'topics', function(err, hashtags) {
    if(!err) {
        getMaxIds(0, hashtags);
    } else {
        console.log(err);
    }
});

//get the last (max) tweet id in the database for each hashtag
var hashtagsQuery = [];
var getMaxIds = function(i, hashtagsArr) {
    if (i < hashtagsArr.length) {
        var getTopics = function(j) {
            if (j < hashtagsArr[i]['topics'].length) {
                getTweet(hashtagsArr[i]['topics'][j]).then(tweet => {
                    if(tweet.length==0) {
                        hashtagsQuery.push({hashtag: hashtagsArr[i]['topics'][j], id: 0});
                    } else {
                        hashtagsQuery.push({hashtag: hashtagsArr[i]['topics'][j], id: tweet[0]['id']});
                    }
                    getTopics(j+1);
                });
            } else {
                getMaxIds(i+1, hashtagsArr);
            }
        };
        getTopics(0);
    } else {
        getTweets(hashtagsQuery);
    }
};

//helper function to get the tweet with the max id
async function getTweet(currHash) {
    const tweet = await TweetModel.find({hashtags: currHash}).sort({id: -1}).select('id').limit(1);
    return tweet;
}

//get all the tweets since the max id in the database
function getTweets(hashtagIds) {
var hashIndex = 0;
//use async.whilst because we need to wait for each get function to complete running before running the next
//this is because the twitter API returns tweets in "pages" and allows you to set max_id to the last id in the
//previous query in order to get the next page
async.whilst(function() {
    return hashIndex < hashtagIds.length;
},
function(nextouter) {
    var lastid = hashtagIds[hashIndex]['id'];
    var maxId = 0;
    var params;
    var done = 0;
    var query = "#" + hashtagIds[hashIndex]['hashtag'];
    //if there are tweets in the database for this hashtag, only get the tweets after the greatest id
    if (lastid > 0) {
        params = { q: query, count: 100, tweet_mode: "extended", since_id: lastid };
    } else {
        params = { q: query, count: 100, tweet_mode: "extended" };
    }
    T.get('search/tweets', params, function(err, data, response) {
        if(!err){
            var tweets = data['statuses'];
            for(let t of tweets)
            {
                //get all of the hashtags in this tweet for the "hashtags" column in the tweet model
                var hashtags = [];
                for (let h of t.entities.hashtags)
                {
                    hashtags.push(h.text)
                }

                //put each tweet in the database
                var newTweet = TweetModel({
                    id: t.id,
                    username: t.user.name,
                    handle: "@" + t.user.screen_name,
                    timestamp: new Date(t.created_at),
                    content: t.full_text,
                    hashtags: hashtags,
                    likes: t.favorite_count,
                    retweets: t.retweet_count,
                    reply: t.in_reply_to_status_id != null,
                    retweet: t.retweeted_status != null
                })
                newTweet.save(function(err) {
                    if (err) throw err;
                });
                maxId = t.id
            }
            if(tweets.length > 0) {
                //save the last id from the results to pass as a query parameter to get the next page
                maxId = tweets[tweets.length - 1]['id'];
                async.whilst(function() {
                    return maxId > lastid || done == 1;
                },
                function (next) {    
                    //the query parameters now include the max_id 
                    if (lastid > 0) {
                        params = { q: query, count: 100, since_id: lastid, max_id: maxId, tweet_mode: "extended" };
                    } else {
                        params = { q: query, count: 100, max_id: maxId, tweet_mode: "extended" };
                    }
                    T.get('search/tweets', params, function(err, data, response) {
                        if(!err){
                            var tweets = data['statuses'];
                            if (tweets == null) {
                                nextouter();
                            }
                            //remove first tweet because it is a duplicate due to max_id being inclusive
                            tweets.splice(0, 1);
                            for(let t of tweets)
                            {
                                var hashtags = [];
                                for (let h of t.entities.hashtags)
                                {
                                    hashtags.push(h.text)
                                }
                                var newTweet = new TweetModel({
                                    id: t.id,
                                    username: t.user.name,
                                    handle: "@" + t.user.screen_name,
                                    timestamp: new Date(t.created_at),
                                    content: t.full_text,
                                    hashtags: hashtags,
                                    likes: t.favorite_count,
                                    retweets: t.retweet_count,
                                    reply: t.in_reply_to_status_id != null,
                                    retweet: t.retweeted_status != null
                                });
                                newTweet.save(function(err) {
                                    if (err) throw err;
                                });
                            }
                            if (tweets.length > 0) {
                                //this means we're at the end of the pages
                                if (maxId == tweets[tweets.length - 1]['id']) {
                                    done = 1;
                                }
                                maxId = tweets[tweets.length - 1]['id'];
                            }
                            next();
                        } else {
                            console.log(err);
                            return;
                        }
                    });
                },
                function (err) {
                    console.log(err);
                    return;
                });
            }
        } else {
            console.log(err);
        }
        hashIndex++;
        nextouter();
    });
},
function(err) {
    console.log(err);
    return;
});
}
