---
layout: post
title: 参照PHP探针编写的系统信息获取API
tag: [PHP,Linux,Sysinfo]
---

<!--break-->



```php
<?php

function sys_linux()
{
    // UPTIME
    if (false === ($str = @file("/proc/uptime"))) return false;
    $str = explode(" ", implode("", $str));
    $str = trim($str[0]);
    $min = $str / 60;
    $hours = $min / 60;
    $days = floor($hours / 24);
    $hours = floor($hours - ($days * 24));
    $min = floor($min - ($days * 60 * 24) - ($hours * 60));
    if ($days !== 0) $res['uptime'] = $days.".";
    if ($hours !== 0) $res['uptime'] .= $hours.".";
    $res['uptime'] .= $min;

    // MEMORY
    if (false === ($str = @file("/proc/meminfo"))) return false;
    $str = implode("", $str);
    preg_match_all("/MemTotal\s{0,}\:+\s{0,}([\d\.]+).+?MemFree\s{0,}\:+\s{0,}([\d\.]+).+?Cached\s{0,}\:+\s{0,}([\d\.]+).+?SwapTotal\s{0,}\:+\s{0,}([\d\.]+).+?SwapFree\s{0,}\:+\s{0,}([\d\.]+)/s", $str, $buf);
	preg_match_all("/Buffers\s{0,}\:+\s{0,}([\d\.]+)/s", $str, $buffers);

    $res['memTotal'] = round($buf[1][0]/1024, 2);
    $res['memFree'] = round($buf[2][0]/1024, 2);
    $res['memBuffers'] = round($buffers[1][0]/1024, 2);
	$res['memCached'] = round($buf[3][0]/1024, 2);
    $res['memUsed'] = $res['memTotal']-$res['memFree'];
    $res['memPercent'] = (floatval($res['memTotal'])!=0)?round($res['memUsed']/$res['memTotal']*100,2):0;

    $res['memRealUsed'] = $res['memTotal'] - $res['memFree'] - $res['memCached'] - $res['memBuffers']; //真实内存使用
	$res['memRealFree'] = $res['memTotal'] - $res['memRealUsed']; //真实空闲
    $res['memRealPercent'] = (floatval($res['memTotal'])!=0)?round($res['memRealUsed']/$res['memTotal']*100,2):0; //真实内存使用率

	$res['memCachedPercent'] = (floatval($res['memCached'])!=0)?round($res['memCached']/$res['memTotal']*100,2):0; //Cached内存使用率

    $res['swapTotal'] = round($buf[4][0]/1024, 2);
    $res['swapFree'] = round($buf[5][0]/1024, 2);
    $res['swapUsed'] = round($res['swapTotal']-$res['swapFree'], 2);
    $res['swapPercent'] = (floatval($res['swapTotal'])!=0)?round($res['swapUsed']/$res['swapTotal']*100,2):0;

    return $res;
}

$uptime = $sysInfo['uptime'];

$sysInfo = sys_linux();

$memTotal = round($sysInfo['memTotal']/1024,3);
$mt = round($sysInfo['memTotal']/1024,3);
$mu = round($sysInfo['memUsed']/1024,3);
$mf = round($sysInfo['memFree']/1024,3);
$mc = round($sysInfo['memCached']/1024,3);
$mb = round($sysInfo['memBuffers']/1024,3);
$st = round($sysInfo['swapTotal']/1024,3);
$su = round($sysInfo['swapUsed']/1024,3);
$sf = round($sysInfo['swapFree']/1024,3);
$swapPercent = $sysInfo['swapPercent'];
$memRealUsed = round($sysInfo['memRealUsed']/1024,3); //真实内存使用
$memRealFree = round($sysInfo['memRealFree']/1024,3); //真实内存空闲
$memRealPercent = $sysInfo['memRealPercent']; //真实内存使用比率
$memPercent = $sysInfo['memPercent']; //内存总使用率
$memCachedPercent = $sysInfo['memCachedPercent']; //cache内存使用率

$strs = @file("/proc/net/dev");

for ($i = 2; $i < count($strs); $i++ )
{
    preg_match_all( "/([^\s]+):[\s]{0,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/", $strs[$i], $info );

    $tmo = round($info[2][0]/1024/1024, 5);
    $tmo2 = round($tmo / 1024, 5);
    $NetInput[$i] = $tmo2;
    $tmp = round($info[10][0]/1024/1024, 5);
    $tmp2 = round($tmp / 1024, 5);
    $NetOut[$i] = $tmp2;

}

/**
 * Deliver HTTP Response
 * @param string $api_response The desired HTTP response data
 * @return void
 **/
function deliver_response($api_response){

    // Define HTTP responses
    $http_response_code = array(
        200 => 'OK',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found'
    );

    // Set HTTP Response
    header('HTTP/1.1 '.$api_response['status'].' '.$http_response_code[ $api_response['status'] ]);


    // Set HTTP Response Content Type
    header('Content-Type: application/json; charset=utf-8');

    // Format data into a JSON response
    $json_response = json_encode($api_response);

    // Deliver formatted data
    echo $json_response;

    // End script process
    exit;

}

// Define API response codes and their related HTTP response
$api_response_code = array(
    0 => array('HTTP Response' => 400, 'Message' => 'Unknown Error'),
    1 => array('HTTP Response' => 200, 'Message' => 'Success'),
    2 => array('HTTP Response' => 403, 'Message' => 'HTTPS Required'),
    3 => array('HTTP Response' => 401, 'Message' => 'Authentication Required'),
    4 => array('HTTP Response' => 401, 'Message' => 'Authentication Failed'),
    5 => array('HTTP Response' => 404, 'Message' => 'Invalid Request'),
    6 => array('HTTP Response' => 400, 'Message' => 'Invalid Response Format')
);

// Set default HTTP response of 'ng'
$response['code'] = 0;
$response['status'] = 404;

?>

<?php

$tmp = array(
    'memTotal', 'memUsed', 'memFree', 'memPercent',
    'memCached', 'memRealPercent',
    'swapTotal', 'swapUsed', 'swapFree', 'swapPercent'
);
foreach ($tmp AS $v) {
    $sysInfo[$v] = $sysInfo[$v] ? $sysInfo[$v] : 0;
}

$response['uptime'] = $sysInfo['uptime'];

$response['physical']['total'] = $memTotal;
$response['physical']['used'] = $mu;
$response['physical']['free'] = $mf;
$response['physical']['persent'] = $memPercent;

if($sysInfo['memCached']>0)
{
    $response['cached']['total'] = $mc;
    $response['cached']['persent'] = $memCachedPercent;
    $response['buffer'] = $mb;

    $response['realmem']['used'] = $memRealUsed;
    $response['realmem']['free'] = $memRealFree;
    $response['realmem']['persent'] = $memRealPercent;
}

if($sysInfo['swapTotal']>0)
{
    $response['swap']['total'] = $st;
    $response['swap']['used'] = $su;
    $response['swap']['free'] = $sf;
    $response['swap']['persent'] = $swapPercent;
}

?>

<?php

if (false !== ($strs = @file("/proc/net/dev"))) :
    for ($i = 2; $i < count($strs); $i++ ) :
        preg_match_all( "/([^\s]+):[\s]{0,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/", $strs[$i], $info );
        $response['net'][$info[1][0]]['in'] = $NetInput[$i];
        $response['net'][$info[1][0]]['out'] = $NetOut[$i];
    endfor;
endif;

?>

<?php
    $response['code'] = 1;
    $response['status'] = $api_response_code[ $response['code'] ]['HTTP Response'];

    deliver_response($response);
?>

```


Refer : http://lnmp.org

