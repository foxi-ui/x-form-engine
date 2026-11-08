import 'antd/dist/antd.css';
import ReactDOM from 'react-dom';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('designer-demo 找不到 #root 容器');
}

// React 17 使用 ReactDOM.render（不是 createRoot）。
ReactDOM.render(<App />, container);
