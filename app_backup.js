
// Untuk async query

var async=require('async');

// DB Mysql

var mysql= require('mysql');

// Express untuk API

var express = require('express');

var app= express();

// url untuk passing parameter lewat url

const url = require('url'); 

// EJS untuk render view

app.set('view engine', 'ejs');

// Session untuk simpan variable global

var session= require('express-session');
app.use(session({secret: 'ssssshhhhhhh'}));
var sess;

// Body-parser buat ambil data input

var bodyParser= require('body-parser')
var urlencodedParser= bodyParser.urlencoded({extended: true})
app.use(bodyParser.json()); // to support JSON bodies


// File Upload buat gambar

const fileUpload = require("express-fileupload");
app.use(fileUpload());

// untuk generate nama file uniq
var uniqid = require('uniqid');


// Express.static untuk set path sebagai static
app.use(express.static(__dirname+'/lib'));
app.use(express.static(__dirname+'/public'));

app.use('/dashboard-season-edit',express.static(__dirname+'/lib'));
app.use('/dashboard-season-edit',express.static(__dirname+'/public'));


app.use('/dashboard-item-stock-input',express.static(__dirname+'/lib'));
app.use('/dashboard-item-stock-input',express.static(__dirname+'/public'));

app.use('/dashboard-item-edit',express.static(__dirname+'/lib'));
app.use('/dashboard-item-edit',express.static(__dirname+'/public'));

app.use('/dashboard-item-changecolorname',express.static(__dirname+'/lib'));
app.use('/dashboard-item-changecolorname',express.static(__dirname+'/public'));

app.use('/category',express.static(__dirname+'/lib'));
app.use('/category',express.static(__dirname+'/public'));

app.use('/product',express.static(__dirname+'/lib'));
app.use('/product',express.static(__dirname+'/public'));





// MySQL Config

var connection= mysql.createConnection (
    { 
        host: "localhost",
        port: 3306,
        database: "ecommerce_fashion",
        user: "root",
        password: "12345",
        multipleStatements:true
    }
);

connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  });




// app.get('/dashboard', function(req, res){
//     res.render(__dirname+'/views/dashboard');
//     res.end();
// });



//#region ------------------------------------------------USER -----------------------------------------

//#region - INDEX

app.get('/', function(req, res){
    res.redirect('/category/1')
});


function uniqueArray(array) {
    var result = Array.from(new Set(array));
    return result    
  }

// Show Category

app.get('/category/:id', function(req, res){

    sess = req.session;
    // var displaySignin="none"
    // var displaySignout="show"
    // if (sess.uid==null)
    // {
    //     displaySignin="show"
    //     displaySignout="none"
    // }
    // console.log(displaySignin)
    // console.log(displaySignout)

        var sql1=`select SeasonalCtgName, ProductCtgName, a.id as productctgid from product_category A 
        join seasonal_category B on b.id=a.seasonalctgid;
        `
        var sql2='select id as productId, productName, CurrPrice from product_hd where productctgid=?;'
        connection.query (sql1+sql2, req.params.id, function(err, rows, field){
            if (err) throw err;

            var arrSeason = rows[0].map(a => a.SeasonalCtgName);
            var distinctSeason=uniqueArray(arrSeason)
            // console.log(distinctSeason)
            var selectedCtg = rows[0].filter(function (el) {
                return el.productctgid == req.params.id
              });

            // console.log(selectedCtg)

            res.render(__dirname+'/views/user/index.ejs', { data:rows, season:distinctSeason, category:selectedCtg[0], uid:sess.uid});

            // console.log(rows)
            
            res.end();

        });
    
})



//#endregion

//#region Product Page



app.get('/product/:id', function(req, res){
    sess = req.session;
    var displaySignin="none"
    var displaySignout="show"
    if (sess.uid==null)
    {
        displaySignin="show"
        displaySignout="none"
    }

    var sql1=`select SeasonalCtgName, ProductCtgName, a.id as productctgid from product_category A 
    join seasonal_category B on b.id=a.seasonalctgid;
    `
    var sql2=`Select a.id as ProductId, ProductName, ProductCtgId, ProductDesc, CurrPrice , ProductCtgName, SeasonalCtgName
    from product_hd A 
    join product_category B on a.productctgid=b.id
    join seasonal_category C on c.id=b.seasonalctgid
    where a.id=? ;`

    var sql3=`Select id, color from product_color where productid=?;`

    var sql4=`Select distinct Size from product_dt where productcolorid in
    (select id from product_color where productid=?);`

    connection.query (sql1+sql2+sql3+sql4, [req.params.id, req.params.id, req.params.id], function(err, rows, field){
        if (err) throw err;

        var arrSeason = rows[0].map(a => a.SeasonalCtgName);
        var distinctSeason=uniqueArray(arrSeason)
        // console.log(distinctSeason)
        // var selectedCtg = rows[0].filter(function (el) {
        //     return el.productctgid == req.params.id
        //   });

        // console.log(selectedCtg)
        var passedVariable = req.query.status
        // console.log(passedVariable)
        var notif=''
        var notifstatus=''
        var notifdisplay='none'
        if (passedVariable==0){
            notif='Maaf, item kosong.'
            notifstatus='danger'
            notifdisplay='show'
        }
        else if (passedVariable==1){
            notif='Item berhasil ditambahkan!'
            notifstatus='success'
            notifdisplay='show'
        }

        res.render(__dirname+'/views/user/product_page.ejs', { data:rows, season:distinctSeason, notif:notif, notifstatus, notifdisplay, displaySignin, displaySignout});

        // console.log(rows)
        
        res.end();

    });

})

app.post('/product/:id', urlencodedParser, function(req, res){
    sess = req.session;
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
    // res.send(req.body.optradio);
    // res.send('Halo')
    // console.log(req.body)
        var sql1=`Select id as ProductDtId from product_dt where productcolorid=? and size=? and stocks>=?
        `
        connection.query(sql1, [req.body.selectedColor, req.body.selectedSize, 1], function (err, result){
            if (err) throw err;
            // console.log(result)
            if (result.length > 0){
                var ProductDtId=result[0].ProductDtId
                var sql2=`Update user_cart set quantity=quantity+? where userid=? and productdtid=?;`
                connection.query(sql2, [1, sess.uid, ProductDtId], function(err,result){
                    if (err) throw err;
                    var sql3=`Insert Into user_cart (userid, productdtid, quantity) 
                    select * from (select ? as a,? as b, ? as c) as X
                    where not exists (select null from user_cart where userid=? and productdtid=?);          
                    `
                    connection.query(sql3, [sess.uid, ProductDtId, 1, sess.uid, ProductDtId], function(err,result){
                        if (err) throw err;
                        // console.log('Item berhasil ditambah')
                        res.redirect(url.format({
                            pathname:"/product/"+req.params.id,
                            query: {
                            "status": 1,
                            }
                        }));
                    })
                })
            }
            else 
            {
                // console.log('Item kosong')
                res.redirect(url.format({
                    pathname:"/product/"+req.params.id,
                    query: {
                    "status": 0,
                    }
                }));
            }
        })
    }
    
})



//#endregion

//#region User Login

app.get('/login', function(req, res){
    res.render(__dirname+'/views/user/user_login',{notif:'', visibility:'none'});
    res.end();
});



app.post('/login', urlencodedParser, function(req, res)
{   
    const decryptSecret='fernando'
    var sql = `select id, name from user_login where email=?
    and CAST(AES_DECRYPT(Password, UNHEX(SHA2(?,512))) AS CHAR(50))=?`
    ;
    connection.query(sql, [req.body.inputEmail, decryptSecret, req.body.inputPassword], function (err, rows) {
    //if (err) throw err;
    // console.log(rows);

        if (rows.length > 0)
        {
            sess=req.session;
            sess.uid = rows[0].id;
            sess.uname = rows[0].username;

            res.redirect('/');
        }
        else
        {
            res.render(__dirname+'/views/user/user_login', 
            {
                notif:'Username atau Password Salah!',
                visibility:'show'
            });
        }
    });
    
    //res.end();
})


// User Log out

app.get('/logout',function(req,res)
{
    req.session.destroy(function(err) 
    {
        if(err) 
        {
            console.log(err);
        } 
        else {
            res.redirect('/');
        }
    });
});
    


//#endregion

//#region USER CART


app.get('/cart/', function(req, res){

    sess = req.session;
    var uid=sess.uid
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql1=`select a.id as CartId, ProductDtId, ProductName, Color, Size, Quantity, Stocks, CurrPrice from user_cart A 
        join product_dt B on a.productdtid=b.id
        join product_color C on b.productcolorid=c.id
        join product_hd D on c.productid=d.id
        where userid=?;
        `
        connection.query (sql1, sess.uid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/user/user_cart',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})




app.get('/cart-delete/:cartId', function (req,res)
{   
    sess = req.session;
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var sql1='Delete from user_cart where id=?;'
        connection.query(sql1, req.params.cartId, function(err,result){
            if (err) throw err;
            // console.log(result)
        });
        res.redirect('/cart');
    }
})



app.post('/cart', urlencodedParser, function(req, res)
{   
    sess = req.session;
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {

        var queries = '';

        // console.log(req.body.product)
        
        for (i=0; i<req.body.cart.id.length; i++){
            queries += mysql.format("UPDATE user_cart SET quantity = ? WHERE id = ?; ",[req.body.product.quantity[i], req.body.cart.id[i]])
        }
        // console.log(queries)

        connection.query(queries, function(err, result){
            if (err) throw err;

            sql= `Delete from user_cart where quantity<1`
            connection.query(sql, function(err,result2){
                if (err) throw err;
                res.redirect('/checkout')
            })
        });
    }
})





//#endregion

//#region Checkout Form


app.get('/checkout/', function(req, res){

    sess = req.session;
    var uid=sess.uid
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql1=`select a.id as CartId, ProductDtId, ProductName, Color, Size, Quantity, Stocks, CurrPrice from user_cart A 
        join product_dt B on a.productdtid=b.id
        join product_color C on b.productcolorid=c.id
        join product_hd D on c.productid=d.id
        where userid=?;
        `
        connection.query (sql1, sess.uid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/user/checkout_form',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})




app.post('/checkout', urlencodedParser, function(req, res)
{   
    sess = req.session;
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        // console.log(req.body)
        var sql1=`Select null from user_cart A join product_dt B on a.productdtid=b.id where userid=? and (quantity>stocks or stocks=0)`
        connection.query(sql1, sess.uid , function(err, rows){
            if (err) throw err;
            // console.log(rows)
            if (rows.length>0){
                res.redirect('/cart')
            }
            else {
                // console.log('ok now insert')
                var sql2=`Insert Into Invoice_hd (TotalPrice, InvoiceDate, UserId, RecipientName, KodePos, Provinsi, Kabupaten, FullAddress, RecPhone)
                Select sum(quantity*currprice), now(), ?, ?, ?, ?, ?, ?, ?
                from user_cart i
                join product_dt j on productdtid=j.id
                join product_color k on productcolorid=k.id
                join product_hd l on productid=l.id
                where i.userid=?`
                
                connection.query(sql2, [sess.uid, req.body.name, req.body.zip, req.body.provinsi, req.body.kabupaten, req.body.address, req.body.phone, sess.uid ] , function(err, result){

                    if (err) throw err;
                    // console.log(result.insertId)
                    // res.redirect('/category/1')
                    sql3=`Insert Into Invoice_dt (InvoiceId, ProductName, ProductColor, ProductSize, Quantity, ProductPrice)
                    Select ?, productname, color, size, quantity, currprice
                    from user_cart i
                    join product_dt j on productdtid=j.id
                    join product_color k on productcolorid=k.id
                    join product_hd l on productid=l.id
                    where userid=?`
                    connection.query(sql3, [result.insertId, sess.uid ] , function(err, result){
                        if (err) throw err;
                        // console.log(result)
                        sql4=`Delete from user_cart where userid=?`
                        connection.query(sql4, sess.uid , function(err, result){
                            if (err) throw err;
                            res.render(__dirname+'/views/user/checkout_success',{displaySignin, displaySignout});
                        });
                    });

                });
            }
            
        });
        // var queries = '';

        // // console.log(req.body.product)
        
        // for (i=0; i<req.body.cart.id.length; i++){
        //     queries += mysql.format("UPDATE user_cart SET quantity = ? WHERE id = ?; ",[req.body.product.quantity[i], req.body.cart.id[i]])
        // }
        // // console.log(queries)

        // connection.query(queries, function(err, result){
        //     if (err) throw err;

        //     sql= `Delete from user_cart where quantity<1`
        //     connection.query(sql, function(err,result2){
        //         if (err) throw err;
        //         res.redirect('/cart')
        //     })
        // });
    }
})






//#endregion


//#region View Invoice



app.get('/invoice/', function(req, res){

    sess = req.session;
    var uid=sess.uid
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql=`select * from invoice_hd where userid=?;        `
        connection.query (sql, sess.uid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/user/user_invoice_hd',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})



app.get('/invoice/:invoiceid', function(req, res){

    sess = req.session;
    var uid=sess.uid
    if (sess.uid==null)
    {
        res.redirect('/login');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql=`select * from invoice_dt where invoiceid=?;        `
        connection.query (sql, req.params.invoiceid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/user/user_invoice_dt',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})







//#endregion







//#region -----------------------------------------------ADMIN --------------------------------------

//#region - ADMIN AUTHENTICATION

// Admin Login

app.get('/admin', function(req, res){
    res.render(__dirname+'/views/admin_login.ejs',{notif:'', visibility:'none'});
    res.end();
});


app.post('/admin-login', urlencodedParser, function(req, res)
{   
    var decryptSecret='fernando'
    var sql = `select id, username from admin_login where (email=? or username=?)
    and CAST(AES_DECRYPT(Password, UNHEX(SHA2(?,512))) AS CHAR(50))=?`
    ;
    connection.query(sql, [req.body.inputEmail, req.body.inputEmail, decryptSecret, req.body.inputPassword], function (err, rows) {
    //if (err) throw err;
    // console.log(rows);

        if (rows.length > 0)
        {
            sess=req.session;
            sess.userid = rows[0].id;
            sess.username = rows[0].username;

            res.redirect('/dashboard-item');
        }
        else
        {
            res.render(__dirname+'/views/admin_login.ejs', 
            {
                notif:'Username atau Password Salah!',
                visibility:'visible'
            });
        }
    });
    
    //res.end();
})



// Admin Log out

app.get('/admin-logout',function(req,res)
{
    req.session.destroy(function(err) 
    {
        if(err) 
        {
            console.log(err);
        } 
        else {
            res.redirect('/admin');
        }
    });
});
    
//#endregion

//#region - DASHBOARD ITEM

// Show Items


app.get('/dashboard-item', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql=`select a.id as ProductId, productname, seasonalctgname, productctgname, color, size, stocks, e.upddate, d.id as ProductColorId, e.id as ProductDtId 
        from product_hd A 
        left join product_category B on a.productctgid=b.id
        left join seasonal_category C on b.seasonalctgid=c.id
        left join product_color D on d.productid=a.id
        left join product_dt E on e.productcolorid=d.id;
        `
        connection.query (sql, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/daftar_item.ejs', { data:rows});

            // console.log(rows)

            res.end();

        });
    }
})

// Create Item

app.get('/dashboard-item-new', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
    
        var sql=`select a.id, productctgname, seasonalctgname from product_category A join seasonal_category B on seasonalctgid=b.id;
        `
        connection.query (sql, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/new_item', { data:rows});

            res.end();

        });
    }
})


app.post('/insert/item', urlencodedParser, function(req, res){

    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        // console.log(req.files.imageUploaded);
        // console.log(req.body)
        // if (!req.files.imageUploaded)
        // return res.status(400).send("No files were uploaded.");
        // The name of the input (i.e. "userfile") is used to retrieve the uploaded file
        let productImage = req.files.imageUploaded;

        var imgName=uniqid()+ "." + productImage.mimetype.split("/")[1];

        productImage.mv(__dirname + "/public/img/" + imgName, function(err) {
            // if (err)
            //     return res.status(500).send(err);
    
            // res.send("File uploaded");
        });

        var sql1='insert into product_hd set ?';
        var values={
            ProductName: req.body.NewItemName,
            ProductCtgId: req.body.SelectedProductCtg,
            ProductDesc: req.body.ProductDescription,
            CurrPrice: req.body.Price,
            InputBy: sess.username,
            ProductImgName: imgName
            }
        connection.query(sql1, values, function (err, result){
            if (err) throw err;
            // console.log(req.body)
            var prodId=result.insertId
            var sql2='insert into product_color (ProductId, Color) values ?'
            req.body.color.pop()
            var Array1=[Array.from(req.body.color).map(function(g){return [prodId, g]; })]
            // console.log(Array1)
            // console.log(arr)
            connection.query(sql2, Array1, function (err, result2){
                if (err) throw err;
                // console.log(result2)
                connection.query("select id from product_color where ?",
                {productid:prodId}, 
                function(err, colorIdArray){
                    // console.log(colorIdArray)
                    var sql3="insert into product_dt (ProductColorId, Size, Stocks, UpdBy) values ?"
                    req.body.size.pop()
                    var Array2=[]
                    for (i=0; i<colorIdArray.length; i++){
                        for (j=0; j<req.body.size.length; j++){
                            temp=[colorIdArray[i].id,req.body.size[j],0,sess.username]
                            Array2.push(temp)
                        }
                    }
                    // console.log(Array2)
                    connection.query(sql3, [Array2], function (err, result3){
                        if (err) throw err;
                    })
                    res.redirect('/dashboard-item-stock-input/'+prodId);
                })
            })
        });
    }
    // console.log(req.body)
    // res.redirect('/dashboard-item-stock-input/'+prodId);
})



// connection.query('select id from product_hd where productname= ?', 
// req.body.NewItemName,
// function(err, rows){
// console.log(rows)
// })        


// Delete Item

app.get('/dashboard-itemsize-delete/:prodId/:colorId/:dtId', function (req,res)
{   
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql1='Delete from product_dt where id=?;'
        connection.query(sql1, req.params.dtId, function(err,result){
            if (err) throw err;
            // console.log(result)
            var sql2='Delete from product_color where not exists (select null from product_dt where product_color.id=productcolorid) and id=?;'
            connection.query(sql2, req.params.colorId, function (err,result2){
                if (err) throw err;
                // console.log(result2)
                var sql3='Delete from product_hd where not exists (select null from product_color where product_hd.id=productid) and id=?;'
                connection.query(sql3, req.params.prodId, function (err,result3){
                    // console.log(result3)
                })
            })
        });
        res.redirect('/dashboard-item');
    }
})

// Edit Item


app.get('/dashboard-item-edit/:id', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql1=`select a.id, productname, productctgid, productdesc, currprice, productctgname, seasonalctgname  from product_hd A 
        join product_category B on a.productctgid=b.id
        join seasonal_category C on b.seasonalctgid=c.id
        where a.id=?;`

        var sql2=`select a.id as productctgid, productctgname, seasonalctgname 
        from product_category A  join seasonal_category B on a.seasonalctgid=b.id
        where a.id <> (select productctgid from product_hd where id=?);`

        var sql3=`select id as productcolorid, color from product_color where productid=?;`
        
        var sql4=`select distinct size from product_dt where productcolorid in (select id from product_color where productid=?);`

        connection.query (sql1+sql2+sql3+sql4, 
        [req.params.id, req.params.id, req.params.id, req.params.id]
        ,    
        function(err, rows){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/edit_item', {data:rows});

            // console.log(rows)

            res.end();

        });
    }
})


app.post('/update/item/:id', urlencodedParser, function (req,res) {
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql1='update product_hd set ? where ?';
        var values=     [
                {
                ProductName: req.body.NewItemName,
                ProductCtgId: req.body.SelectedProductCtg,
                ProductDesc: req.body.ProductDescription,
                CurrPrice: req.body.Price
                },
                {
                id: req.params.id
                }
            ]
            
        connection.query(sql1, values, function(err,result){
            if (err) throw err;

            //  console.log(req.body.color)
            //  console.log(req.body.color.length)
            if (req.body.newColor.length>0 ){
                req.body.newColor.pop()
                var sql2='insert into product_color (ProductId, Color) values ?'
                var Array1=[Array.from(req.body.newColor).map(function(g){return [req.params.id, g]; })]
                // console.log(Array1)
                connection.query(sql2, Array1, function (err, result2){
                    if (err) throw err;
                    // console.log(result2)

                    // console.log(size)

                })
            }

            var size=req.body.currentSize.concat(req.body.newSize);
            size.pop();

            if (req.body.newColor.length>0 || req.body.newSize.length>0){
                var queries='';
                for (i=0; i<size.length; i++){
                    var sql3=`Insert into product_dt (productcolorid, size, stocks, updby)
                    Select a.id, ?, 0, ? from 
                    product_color A where productid=?
                    and not exists (select * from product_dt where a.id=productcolorid and size=?);
                    `
                    queries += mysql.format(sql3,
                    [size[i], sess.username, req.params.id, size[i]]
                    )
                }
                // console.log(queries)
                connection.query(queries, function(err, result){
                    // console.log(result)
                });
            }
        });
        res.redirect('/dashboard-item-stock-input/'+req.params.id);
    }
})




// Edit Color Name


app.get('/dashboard-item-changecolorname/:id', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query ("select id, color from product_color where id=?", req.params.id,    
        function(err, rows){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/edit_item_color_name', {data:rows});

            // console.log(rows)

            res.end();

        });
    }
})

app.post('/update/colorname/:id', urlencodedParser, function (req,res) {
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query('update product_color set color=? where id=?', 
        [
            req.body.newColorName,
            req.params.id
        ]);
        res.redirect('/dashboard-item')
    }
})





// Update stock


app.get('/dashboard-item-stock-input/:id', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql=`select a.id as ProductId, productname, color, size, stocks, d.id as ProductColorId, e.id as ProductDtId 
        from product_hd A 
        left join product_color D on d.productid=a.id
        left join product_dt E on e.productcolorid=d.id
        where a.id=?;
        `
        connection.query (sql, req.params.id, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/new_item_stock', { data:rows});

            res.end();

        });
    }
});



app.post('/update/item_stock', urlencodedParser, function (req,res) {

    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {

        var queries = '';

        // console.log(req.body.product)
        
        for (i=0; i<req.body.product.id.length; i++){
            queries += mysql.format("UPDATE product_dt SET stocks = ? WHERE id = ?; ",[req.body.product.stock[i], req.body.product.id[i]])
        }
        // console.log(queries)

        connection.query(queries, function(err, result){
            // console.log(result)
        });
        res.redirect('/dashboard-item')
    }
})

//#endregion

//#region - DASHBOARD SEASON

// Show Season

app.get('/dashboard-season', function(req, res){

    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql=`select a.id, a.seasonalctgname, count(b.seasonalctgid) as n_ctg, case when y.num is null then 0 else y.num end as n_prod, a.createdate from seasonal_category A
        left join product_category B on a.id=b.seasonalctgid
        join
            (select a.seasonalctgname, x.num from seasonal_category A
            left join product_category B on a.id=b.seasonalctgid
            left join product_hd C on b.id=c.productctgid
            left join
                (select seasonalctgname, productctgname, count(*) as num from seasonal_category I 
                join product_category J on i.id=j.seasonalctgid
                join product_hd K on j.id=k.productctgid) X on 
                a.seasonalctgname=x.seasonalctgname and b.productctgname=x.productctgname
            group by seasonalctgname) Y on y.seasonalctgname=a.seasonalctgname
        group by seasonalctgname;
        `
        connection.query (sql, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/daftar_season.ejs', { data:rows});

            // console.log(rows)

            res.end();

        });
    }
})


// Insert Season


app.get('/dashboard-season-new', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        res.render(__dirname+'/views/admin_dashboard/new_season');
        res.end();
    }
});


            // app.post('/insert/season', urlencodedParser, function(req, res){
            // 	// console.log(req.body);
            //     // res.render(__dirname+'/views/form_OK', {data:req.body});
            //     connection.query('insert into seasonal_category set ?', {
            //         SeasonalCtgName: req.body.newseasonalctgname,
            //         CreateDate: new Date(),
            //         InputBy: 'nando'
            //         });
            //     res.redirect('/dashboard-season');
            // })


app.post('/insert/season', urlencodedParser, function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query('insert into seasonal_category set ?', {
            SeasonalCtgName: req.body.newseasonalctgname,
            CreateDate: new Date(),
            InputBy: sess.username
            }, 
            function(err, result) {
                if (err) { 
                connection.rollback(function() {
                    throw err;
                });
                }  
                connection.commit(function(err) {
                if (err) { 
                    connection.rollback(function() {
                    throw err;
                    });
                }
                console.log('Transaction Complete.');
                connection.end();
                });
        });
        res.redirect('/dashboard-season');
    }
})



// Delete Season

app.get('/dashboard-season-delete/:id', function (req,res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query("delete from seasonal_category where ?",
        {
            id: req.params.id
        });
        res.redirect('/dashboard-season');
    }
})


// Edit Season


app.get('/dashboard-season-edit/:id', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query ("select id, seasonalctgname from seasonal_category where ?", 
        {
            id:req.params.id
        },    
        function(err, rows){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/edit_season', {data:rows});

            // console.log(rows)

            res.end();

        });
    }
})

app.post('/update/season/:id', urlencodedParser, function (req,res) {
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query('update seasonal_category set ? where ?', 
        [
            {
                SeasonalCtgName: req.body.newseasonalctgname,
            },
            {
                id: req.params.id
            }
        ]);
        res.redirect('/dashboard-season')
    }
})

//#endregion

//#region - DASHBOARD CATEGORY

// Show Category

app.get('/dashboard-category', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql=`select b.id, a.seasonalctgname, b.productctgname, case when x.num is null then 0 else x.num end as num, b.createdate from seasonal_category A
        join product_category B on a.id=b.seasonalctgid
        left join product_hd C on b.id=c.productctgid
        left join
            (select seasonalctgname, productctgname, count(*) as num from seasonal_category I 
            join product_category J on i.id=j.seasonalctgid
            join product_hd K on j.id=k.productctgid) X on 
            a.seasonalctgname=x.seasonalctgname and b.productctgname=x.productctgname
        group by seasonalctgname, productctgname;    
        `
        connection.query (sql, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/daftar_kategori.ejs', { data:rows});

            // console.log(rows)

            res.end();

        });
    }
})


// Create Category

app.get('/dashboard-category-new', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query ("select id, seasonalctgname from seasonal_category", function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/new_kategori', { data:rows});

            res.end();

        });
    }
})


app.post('/insert/category', urlencodedParser, function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query('insert into product_category set ?', {
            SeasonalCtgId: req.body.SelectedSeasonalCtg,
            ProductCtgName: req.body.newproductctgname,
            CreateDate: new Date(),
            InputBy: sess.username
            });
        res.redirect('/dashboard-category');
    }
})


// Delete Category

app.get('/dashboard-category-delete/:id', function (req,res)
{
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query("delete from product_category where ?",
        {
            id: req.params.id
        });
        res.redirect('/dashboard-category');
    }
})


// Edit Category

app.use('/dashboard-category-edit',express.static(__dirname+'/lib'));
app.use('/dashboard-category-edit',express.static(__dirname+'/public'));




app.get('/dashboard-category-edit/:id', function(req, res){
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var sql1=`select a.id, seasonalctgid, seasonalctgname, productctgname
        from product_category A join seasonal_category B on a.seasonalctgid=b.id where a.id=?;
        `
        var sql2=`select id, seasonalctgname from seasonal_category 
        where id <> (select seasonalctgid from product_category where id=?) ;`

        connection.query (sql1+sql2, 
        [req.params.id, req.params.id ]
        ,    
        function(err, rows){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/edit_kategori', {data:rows});

            // console.log(rows)

            res.end();

        });
    }
})


app.post('/update/category/:id', urlencodedParser, function (req,res) {
    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        connection.query('update product_category set ? where ?', 
        [
            {
                SeasonalCtgId: req.body.SelectedSeasonalCtg,
                ProductCtgName: req.body.newproductctgname,
            },
            {
                id: req.params.id
            }
        ]);
        res.redirect('/dashboard-category')
    }
})

// #endregion




//#region View Invoice Admin



app.get('/dashboard-invoice/', function(req, res){

    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql=`select * from invoice_hd ;  `
        connection.query (sql, sess.uid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/user_invoice_hd',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})


app.get('/dashboard-invoice/:invoiceid', function(req, res){

    sess = req.session;
    if (sess.userid==null)
    {
        res.redirect('/admin');
    }
    else
    {
        var displaySignin="none"
        var displaySignout="show"
        var sql=`select * from invoice_dt where invoiceid=?;        `
        connection.query (sql, req.params.invoiceid, function(err, rows, field){
            if (err) throw err;

            res.render(__dirname+'/views/admin_dashboard/user_invoice_dt',{data:rows, displaySignin, displaySignout});

            // console.log(rows)
            
            res.end();

        });
    }
})


// #endregion


app.listen(3010, () => {
    console.log('Server aktif di port 3010')
});