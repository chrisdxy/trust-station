const http = require('http');

const data = JSON.stringify({
  userId: 'UID15502105726',
  partner_id: 'UID19155449102',
  authorized_record_id: 1,
  scope: 'view',
  description: '测试授权',
  partner_name: '测试用户',
  grantee_email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/authorizations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('发送请求...');
console.log('Data:', data);
console.log('');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers));
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
    console.log('Received chunk:', chunk.toString());
  });
  res.on('end', () => {
    console.log('');
    console.log('完整响应:', body);
    
    if (res.statusCode === 200) {
      console.log('');
      console.log('✅ API 调用成功！');
    } else {
      console.log('');
      console.log('❌ API 调用失败');
      try {
        const parsed = JSON.parse(body);
        console.log('错误详情:', parsed);
      } catch (e) {
        console.log('无法解析响应为 JSON');
      }
    }
  });
});

req.on('error', (err) => {
  console.error('');
  console.error('请求错误:', err.message);
});

req.write(data);
req.end();
