import * as vscode from 'vscode';
import * as net from 'net';

/**
 * Returned data:
 * 	ACK OK 266
	repeat:  false
	random:  false
	volume:  100
    state:  playing
 	duration:  364.59102
	position:  59.80689271655395
    song:  fuo://netease/songs/2151235037      # オムライス - ReoNa
  	lyric-s:   でも糸が切れたら行けなくなるのわかってた
 */
// 解析返回内容为 dictionary
function parseData(data: string) {
    const lines = data.trim().split('\n');
    const result: { [key: string]: any } = {};

    lines.forEach(line => {
        const [key, value] = line.split(': ').map(part => part.trim());

		//if stripped key is song
        if (key.trim() === 'song') {
            const songMatch = value.match(/(.+)\s+#\s+(.+)/);
            if (songMatch) {
                result['song_url'] = songMatch[1].trim();
                result['song_name'] = songMatch[2].trim();
            }
        } else if (key) {
            // 尝试转换数值类型
            const parsedValue = isNaN(Number(value)) ? value : Number(value);
            result[key] = parsedValue;
        }
    });

    return result;
}


export function activate(context: vscode.ExtensionContext) {
    // 創建狀態欄項目
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.show();

    // 創建 TCP 客戶端
    const client = new net.Socket();

    // 連接到 TCP 服務器，替換為實際的主機名和端口號
    client.connect(23333, 'localhost', () => {
        console.log('TCP connected');
        
        // 每秒發送一次數據
        const sendData = () => {
            const message = 'status\n';
            client.write(message);
            console.log('Message sent:', message);
        };

        // 每秒發送一次數據
        const interval = setInterval(sendData, 1000);

        // 當擴展被禁用時清除計時器
        context.subscriptions.push({
            dispose: () => {
                clearInterval(interval);
                client.end(); // 關閉 TCP 連接
            }
        });
    });

    // 當收到服務器返回的數據時觸發
    client.on('data', (data) => {
        console.log('Received:', data.toString());
		const parsed = parseData(data.toString());

        // 更新狀態欄顯示
        statusBarItem.text = `${parsed['lyric-s']} - ${parsed['song_name']}`;
    });

    // 當 TCP 連接關閉時觸發
    client.on('close', () => {
        console.log('TCP connection closed');
        statusBarItem.text = 'TCP disconnected';
    });

    // 處理 TCP 錯誤
    client.on('error', (error) => {
        console.error('TCP error:', error);
        statusBarItem.text = 'TCP error';
    });
}

export function deactivate() {}
