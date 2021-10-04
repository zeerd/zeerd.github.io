---
layout: post
title: 基于PHP和Sqlite3的简易设备预订系统
tags: [PHP,Sqlite,SQL]
---

<!--break-->

首先是要准备一个数据库，参照下面的sql语句创建：

```sql
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE "sets" (
    "set_id" INTEGER PRIMARY KEY NOT NULL DEFAULT (0),
    "name" TEXT NOT NULL DEFAULT ('""')
);
INSERT INTO "sets" VALUES(1,'Equip1');
INSERT INTO "sets" VALUES(2,'Equip2');
INSERT INTO "sets" VALUES(3,'Equip3');
INSERT INTO "sets" VALUES(4,'Equip4');
CREATE TABLE "users" (
    "ip" TEXT NOT NULL DEFAULT ('127.0.0.1'),
    "name" TEXT NOT NULL
);
CREATE TABLE "records" (
    "book_user" TEXT NOT NULL,
    "book_date" TEXT NOT NULL,
    "book_time" TEXT NOT NULL,
    "set_name" TEXT NOT NULL
);
CREATE TABLE "times" (
    "time_section" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL
);
INSERT INTO "times" VALUES('9:00 - 12:00',1);
INSERT INTO "times" VALUES('13:00 - 18:00',2);
CREATE VIEW "record_all" AS select records.*, times.id as book_time_id from records left join times on times.time_section=records.book_time;
CREATE UNIQUE INDEX unique_index_ip_in_users on users (ip ASC);
COMMIT;
```


其次，需要一个页面用来显示设备的列表及预订信息。
在首次使用这个系统的时候，会先要求用户输入一个名字并绑定到客户IP上。

<b>index.html</b>

```php
<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />

<style type="text/css">
form {
 margin-bottom: 0px;
}
</style>
</head>
<body>

<?php

$db = new SQLite3('db/equip_booking.db', 6);


$weekday = array("日", "一", "二", "三", "四", "五", "六");
$time = array();
$equip = array();

$sql = "select name from users where ip='".get_client_ip()."'";
$result = $db->query($sql);
$row = $result->fetchArray();
$user_name=$row['name'];

$result = $db->query("select time_section from times");
$i=0;
while ($row = $result->fetchArray())
{
    $time[$i] = $row['time_section'];
    $i = $i + 1;
}

$result = $db->query("select set_id, name from sets");
$i=0;
while ($row = $result->fetchArray())
{
    $equip[$i] = $row['name'];
    $i = $i + 1;
}

function get_client_ip()
{
    if ($_SERVER['REMOTE_ADDR']) {
        $cip = $_SERVER['REMOTE_ADDR'];
    } elseif (getenv("REMOTE_ADDR")) {
        $cip = getenv("REMOTE_ADDR");
    } elseif (getenv("HTTP_CLIENT_IP")) {
        $cip = getenv("HTTP_CLIENT_IP");
    } else {
        $cip = "unknown";
    }
    return $cip;
}
?>


<?php

if($user_name == ""){
    echo "<form action=\\"user.php\\" method=\\"post\\">";
        echo "你的IP地址是：";
        echo "<input type=\\"text\\" name=\\"user_ip\\" readonly=true value=\\"".get_client_ip()."\\"/>";
        echo "<br/>";
        echo "请输入你的真实姓名：";
        echo "<input type=\\"text\\" name=\\"user_name\\" />";
        echo "<input type=\\"submit\\" name=\\"submit\\" value=\\"提交\\" />";
    echo "</form>";
}
else{
    echo "<form action=\\"user.php\\" method=\\"post\\">";
        echo "你好，".$user_name."！";
        echo "<input type=\\"hidden\\" name=\\"user_ip\\" readonly=true value=\\"".get_client_ip()."\\"/>";
        echo "（实际上，我是";
        echo "<input type=\\"text\\" name=\\"user_name\\" />";
        echo "<input type=\\"submit\\" name=\\"submit\\" value=\\"更名\\" />";
        echo "）";
    echo "</form>";
    echo "<hr/>";

    echo "<table border=1>";
    echo "<tr>";
    echo "<th></th>";

    $equip_count = 0;
    foreach ($equip as $value){
        echo "<th>". $value ."</th>";
        $equip_count++;
    }

    echo "<th>日期</th>";
    echo "</tr>";

    $day_max = 3;
    if(date("w") >= 4){
        $day_max += 2;
        }
    for($i=0;$i<$day_max;$i++){
        $data = mktime(0,0,0,date("m"),date("d")+$i,date("Y"));
        foreach ($time as $time_value){
            echo "<tr>";
            echo "<td>".$time_value."</td>";
            foreach ($equip as $value){
                echo "<td>";
                $sql = "select book_user from records ".
                    "where set_name='".$value."' and book_date='".date("Y-m-d", $data)."' and book_time='".$time_value."'";
                $result = $db->query($sql);
                $row = $result->fetchArray();
                $book_user = $row['book_user'];
                if($book_user == ""){
                    echo "<form action=\\"book.php\\" method=\\"post\\">";
                    echo "<input type=\\"hidden\\" name=\\"user\\" value=\\"".$user_name."\\"/>";
                    echo "<input type=\\"hidden\\" name=\\"data\\" value=\\"".date("Y-m-d", $data)."\\"/>";
                    echo "<input type=\\"hidden\\" name=\\"time\\" value=\\"".$time_value."\\"/>";
                    echo "<input type=\\"hidden\\" name=\\"equip\\" value=\\"".$value."\\"/>";
                    echo "<input type=\\"submit\\" name=\\"submit\\" value=\\"预定\\" />";
                    echo "</form>";
                }
                else if($book_user == $user_name){
                    echo $book_user."(<a href=\\"cancel.php?user=".$user_name."&data=".date("Y-m-d", $data)."&time=".$time_value."&equip=".$value."\\">取消</a>)";
                }
                else{
                    echo "<b>".$book_user."</b>";
                }
                echo "</td>";
            }
            echo "<td>". date("Y-m-d", $data) ."(".$weekday[date("w", $data)].")</td>";
            echo "</tr>";
        }

        for($ec=0;$ec<$equip_count+2;$ec++){
            echo "<td><hr></td>";
        }
    }
    echo "</table>";

}
?>


</body>
</html>
```


接下来这个页面用来进行用户的绑定：

<b>user.php</b>

```php
<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />
</head>
<body>
<?php

$db = new SQLite3('db/equip_booking.db', 6);

$sql = "replace into users values('".$_POST['user_ip']."', '"
                                    .$_POST['user_name']."')";
//echo $sql;
$db->query($sql);

echo "<a href=\\"index.php\\">返回</a>";

?>
</body>
</html>


接下来这个页面用于进行设备预订：
book.php


<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />
</head>
<body>
<?php

$booked_sets = array();
$booked_times = array();

$db = new SQLite3('db/equip_booking.db', 6);

$user_in = $_POST['user'];
$data_in = $_POST['data'];
$time_in = $_POST['time'];
$equip_in = $_POST['equip'];

$db->query("begin transaction");

$sql = "select book_time_id from record_all where book_time='".$time_in."'";
$result = $db->query($sql);
$row = $result->fetchArray();
$book_time_id = (int)$row['book_time_id'];



if($book_time_id > 1){
    $sql = "select set_name, book_time from record_all ";
    $sql = $sql."where book_date='".$data_in."' and book_user='".$user_in."' ";
    $sql = $sql."    and (book_time_id=".($book_time_id+1)
                    ." or book_time_id=".($book_time_id-1).")";
    //echo $sql."<br/>";
    $result = $db->query($sql);
    $book_user_count = 0;
    while ($row = $result->fetchArray())
    {
        $booked_sets[$book_user_count] = $row['set_name'];
        $booked_times[$book_user_count] = $row['book_time'];
        $book_user_count++;
    }
}
else{
    $sql = "select set_name, book_time from record_all ";
    $sql = $sql."where book_date='".$data_in."' and book_user='".$user_in."' ";
    $sql = $sql."    and (book_time_id=".($book_time_id+1).")";
    //echo $sql."<br/>";
    $result = $db->query($sql);
    $book_user_count = 0;
    while ($row = $result->fetchArray())
    {
        $booked_sets[$book_user_count] = $row['set_name'];
        $booked_times[$book_user_count] = $row['book_time'];
        $book_user_count++;
    }
}

if($book_user_count != 0){
    echo "<a href=\\"index.php\\">你已经预订了";
    for($i=0;$i<$book_user_count;$i++){
        echo "[“".$booked_times[$i]."”的“".$booked_sets[$i]."”]";
    }
    echo "，请不要连续预定！</a>";
}
else{
    $sql = "select book_user from records where book_date='".$data_in
                                           ."' and book_time='".$time_in
                                           ."' and set_name='".$equip_in."'";
    $result = $db->query($sql);
    $row = $result->fetchArray();
    $book_user = $row['book_user'];

    if($book_user == ""){
        $sql = "insert into records values('".$user_in."', '"
                                             .$data_in."', '"
                                             .$time_in."', '"
                                             .$equip_in."')";
        $db->query($sql);
    }

    $db->query("commit transaction");

    if($book_user == ""){
        echo "<a href=\\"index.php\\">返回</a>";
    }
    else{
        echo "<a href=\\"index.php\\">晚了一步。已经被".$book_user."预订了。</a>";
    }
}

?>
</body>
</html>
```

最后这页面实在不需要的时候取消预定的：

<b>cancel.php</b>

```php
<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />
</head>
<body>
<?php

$db = new SQLite3('db/equip_booking.db', 6);

$sql = "delete from records where book_user='".$_GET['user']
     ."' and book_date='".$_GET['data']
     ."' and book_time='".$_GET['time']
     ."' and set_name='".$_GET['equip']."'";
//echo $sql;
$db->query($sql);

echo "<a href=\\"index.php\\">返回</a>";
?>
</body>
</html>
```
