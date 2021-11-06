//index.js file
// import dependencies you will use
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
// set up expess validator
//destructuring  object
const {check, validationResult} = require('express-validator'); 
  
// set up DB connection and connect to DB
mongoose.connect('mongodb://localhost:27017/foodHook',
{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
// get express session
const session = require('express-session');
// set up variables to use packages
//initializing the express app
var myApp = express();
// define the collection(s)
//db model for Blog Page
const Page = mongoose.model('Page',{
    pageName: String,
    pageHeroImage: String,
    pageDescription:String
});

// set up the db model for login
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

// set up session options
myApp.use(session({
    secret: 'shsuvhi843jnr8394r4jrerbubvjdnvi7y3539iutuv',
    resave: false,
    saveUninitialized: true
}));
myApp.use(express.urlencoded({extended:false}));

// set path to public folders and view folders
myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
myApp.use(fileUpload());

var welcomeMessage;
// setting up different routes (pages) of the website

// render the dashboard
myApp.get('/dashboard', function(req, res){
     res.render('dashboard',{welcomeMessage:welcomeMessage});
});
//render the add blog page with the welcome message
myApp.get('/addpage', function(req, res){
    res.render('addpage',{welcomeMessage:welcomeMessage});
});
//render the home page and pass all pages to home
myApp.get('/',function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('home', {pages:pages}); 
    });
});
//post for the add blog form having page title,wysiwig editor,image upload
myApp.post('/process',
[
    //check for whether fields are empty or not
    check('pageName', 'Please enter blog title.').not().isEmpty(),
    check('pageDescription', 'Please enter blog description.').not().isEmpty()
], function(req,res)
{
  Page.find({}).exec(function(err, pages){
    // check for errors
    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        res.render('addpage',
        {
            er: errors.array(),
            pageName:req.body.pageName,
            pageDescription:req.body.pageDescription,
            welcomeMessage:welcomeMessage
        });
    }
    else
    {
        //fetch all the form fields
        var pageName = req.body.pageName; // the key here is from the name attribute not the id attribute
        var pageDescription = req.body.pageDescription;

        //fetch and save the image

        // get the name of the file
        var pageHeroImage= req.files.pageHeroImage.name;
        // get the actual file (temporary file)
        var heroImageFile = req.files.pageHeroImage;
        // decide where to save it 
        var heroImagePath = 'public/uploads/' + pageHeroImage;
        // move temp file to the correct folder (public folder)
        heroImageFile.mv(heroImagePath, function(err){
            console.log(err);
        });

        // create an object with the fetched data to send to the view
        var pageData = {
            pageName : pageName,
            pageDescription : pageDescription,
            pageHeroImage: pageHeroImage,
            pages:pages,
            welcomeMessage:welcomeMessage
        }
        // save data to database
        var myPage = new Page(pageData); // not correct yet, we need to fix it.
        myPage.save().then(function(){
        console.log('New blog page created')
        })
        // send the data to the view and render it
        res.render('page', pageData);
    }
  });
});

// Render the dashboard page
myApp.get('/updatepage',function(req, res)
{
    // check if the user is logged in
    if(req.session.userLoggedIn)
    {
        Page.find({}).exec(function(err, pages)
        {
            res.render('updatepage', {pages:pages,welcomeMessage:welcomeMessage});
        });
    }
    else
    { // otherwise send the user to the login page
        res.redirect('/login');
    }
});

// login page
myApp.get('/login', function(req, res)
{  
    if(!req.session.userLoggedIn)
    {
        Page.find({}).exec(function(err, pages)
        {
         res.render('login',{pages:pages, message:''});
        });        
    }
    else{
        res.redirect('/updatepage');
    }
   
});

// login form post
myApp.post('/login',[
], function(req, res)
{    
    Page.find({}).exec(function(err, pages)
    {
        const errors = validationResult(req);
        if(!errors.isEmpty())
        {
            //retain the login details during validation
            res.render('login',{
                pages:pages,
				message:'',
                username:req.body.username,
                password:req.body.password
            });
        }
        //if no validation errors in login compare with the db values
        else
        {    
            var user = req.body.username;
            var pass = req.body.password;
            Admin.findOne({username: user, password: pass}).exec(function(err, admin)
            {
                if(admin)
                {
                    //store username in session and set logged in true
                    req.session.userLoggedIn = true;
                    welcomeMessage= (user)?`Welcome ${user}!`:"";
                    // redirect to the dashboard
                    res.render('dashboard',{welcomeMessage:welcomeMessage});
                }
                else
                {
                    res.render('login', {pages:pages,message: 'Sorry, cannot login!'});
                } 
            });
        }
    });
});
 
//render login page with msg during logout
myApp.get('/logout', function(req, res)
{
    Page.find({}).exec(function(err, pages)
    {
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('logout',{pages:pages,errors:err,welcomeMessage:welcomeMessage});
    })
});

//Deletion of blog
myApp.get('/delete/:pageid', function(req, res){
    Page.find({}).exec(function(err, pages){
    // check if the user is logged in
    if(req.session.userLoggedIn)
    {
       //getting the particular id 
        var pageid = req.params.pageid;
        //Checking db for the page id and delete
        Page.findByIdAndDelete({_id: pageid}).exec(function(err, page){
            if(page)
            {
                //if the page is found  render the delete page with the message
                res.render('delete', 
                {
                    pageId:pageid,
                    pages:pages,        
                    welcomeMessage:welcomeMessage
                });
            }
            //render the delete page with unsuccessful delete message
            else{
                res.render('delete', 
                {
                    pages:pages,
                    message: 'Sorry, could not delete.Please try again!',
                    welcomeMessage:welcomeMessage
                });
            }
        });
    }
    //if user is not logged in redirect to login page
    else
    {
        res.redirect('/login');
    }
    })
});

//Render the specific edit page with the help of page id
myApp.get('/edit/:pageid', function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn)
    {
        var pageid = req.params.pageid;
        //fetching the page details from db through pageid
        Page.findOne({_id: pageid}).exec(function(err, page)
        {
            if(page)
            {
                res.render('edit', {page:page,welcomeMessage:welcomeMessage});
            }
            //Show unsuccessful message if not found in db
            else
            {
                res.send('No page found with that id...');
            }
        });
    }
    //if user not logged in redirect to login page
    else
    {
        res.redirect('/login');
    }
});

//Post method for edit
myApp.post('/edit/:id', 
function(req,res)
{
  Page.find({}).exec(function(err, pages)
  {
    // check for errors
    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        var pageid = req.params.id;
        Page.findOne({_id: pageid}).exec(function(err, page)
        {
            if(page)
            {
                res.render('edit', {page:page, errors:errors.array(),welcomeMessage:welcomeMessage});
            }
            else
            {
                res.send('No page found with that id...');
            }
        });

    }
    else
    {
        //fetch all the form fields
        var pageName = req.body.pageName; 
        // the key here is from the name attribute not the id attribute
        var pageDescription = req.body.pageDescription;
        //fetch and save the image
        // get the name of the file
        var pageHeroImage= req.files.pageHeroImage.name;
        // get the actual file (temporary file)
        var heroImageFile = req.files.pageHeroImage;
        // decide where to save it 
        var heroImagePath = 'public/uploads/' + pageHeroImage;
        // move temp file to the correct folder (public folder)
        heroImageFile.mv(heroImagePath, function(err){
            console.log(err);
        });
        // create an object with the fetched data to send to the view
        var pageData = 
        { 
            pageId:req.params.id,
            pageName : pageName,
            pageDescription : pageDescription,
            pageHeroImage: pageHeroImage,
            pages:pages,
            welcomeMessage:welcomeMessage
        }
        var id = req.params.id;
        Page.findOne({_id:id}, function(err, page)
        {
            page.pageName = pageName;
            page.pageDescription = pageDescription;
            page.pageHeroImage= pageHeroImage,
            page.save();     
        });
        res.render('editsuccess', pageData);
    }
  });
});

//Display the blog detail page
myApp.get('/:pageid', function(req,res){
    Page.find({}).exec(function(err, pages){
        var pageId = req.params.pageid;
        Page.findOne({_id: pageId}).exec(function(err,page){
            if(page)
            {
                res.render('page', 
                {
                    pageName : page.pageName,
                    pageDescription : page.pageDescription,
                    pageHeroImage : page.pageHeroImage,
                    pages: pages                   
                });
            }
            else{
                res.send('404: Sorry the page is not available.');
            }
        });
    });
});

// start the server and listen at a port
myApp.listen(8888);

//tell everything was ok
console.log('Everything executed fine.. website at port 8888....');


