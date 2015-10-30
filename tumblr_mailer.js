var fs = require('fs');
var ejs = require('ejs');
var tumblr = require('tumblr.js');
var mandrill = require('mandrill-api/mandrill');

var csvFile = fs.readFileSync('friend_list.csv', 'utf8');
var emailTemplate = fs.readFileSync('email_template.ejs', 'utf8');
var apiKeys = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var mandrill_client = new mandrill.Mandrill(apiKeys.mandrill_key);
var client = tumblr.createClient({
  consumer_key: apiKeys.tumblr_consumer_key,
  consumer_secret: apiKeys.tumblr_consumer_secret,
  token: apiKeys.tumblr_token,
  token_secret: apiKeys.tumblr_token_secret
});

var BLOG_URL = "gloriousenemyphantom.tumblr.com";
var NUM_MILLISECONDS_PER_WEEK = 604800000;

var Record = function(firstName, lastName, numMonthsSinceContact, emailAddress) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.numMonthsSinceContact = numMonthsSinceContact;
    this.emailAddress = emailAddress;
}

var csvParse = function(csvFile) {
    csvFile = csvFile.trim(); //In case there is a newline at the end
    var csvLines = csvFile.split("\n");
    var records = [];
    var header = csvLines[0].split(",");
    for (var i = 1; i < csvLines.length; i++) {
        var line = csvLines[i].split(",");
        var record = {};
        for (var j = 0; j < header.length; j++) {
            record[header[j]] = line[j];
        }
        records.push(record);
    }
    return records;
}

client.posts(BLOG_URL, function(err, blog) {
    var latestPosts = [];
    blog.posts.forEach(function(post){
        //if post is less than 1 week old put it into the array
        var now = Date.now();
        var postMs = parseInt(post.timestamp, 10) * 1000;
        if (now - postMs < NUM_MILLISECONDS_PER_WEEK) {
            latestPosts.push(post);
        }      
    });
    var contacts = csvParse(csvFile);
    contacts.forEach(function(contact){
        var firstName = contact['firstName'];
        var numMonths = contact['numMonthsSinceContact'];
        var templateCopy = emailTemplate;
        var customizedTemplate = ejs.render(templateCopy,
                                { firstName: firstName,  
                                  numMonthsSinceContact: numMonths,
                                  latestPosts: latestPosts
                                });
        sendEmail(firstName, contact["emailAddress"], "Michal",
                "michal.novemsky@gmail.com", "Hey " + firstName + ", check out my Tumblr!", customizedTemplate);

    });
});


function sendEmail(to_name, to_email, from_name, from_email, subject, message_html){
    var message = {
        "html": message_html,
        "subject": subject,
        "from_email": from_email,
        "from_name": from_name,
        "to": [{
                "email": to_email,
                "name": to_name
            }],
        "important": false,
        "track_opens": true,    
        "auto_html": false,
        "preserve_recipients": true,
        "merge": false,
        "tags": [
            "Fullstack_Tumblrmailer_Workshop"
        ]    
    };
    var async = false;
    var ip_pool = "Main Pool";
    mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool},
                                function(result) {
    }, function(e) {
        // Mandrill returns the error as an object with name and message keys
        console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
    });
 }

