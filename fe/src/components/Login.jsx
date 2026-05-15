import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const togglePass = () => {
        setShowPassword(!showPassword);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8086/api/auth/login', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Login successful:', data);
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('full_name', data.full_name);
                message.success('Đăng nhập thành công! Đang chuyển hướng...');
                setTimeout(() => {
                    navigate('/home');
                }, 1000);
            } else {
                message.error('Email hoặc mật khẩu không đúng.');
            }
        } catch (error) {
            message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend (CORS hoặc server đang down).');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#f8fafc]">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">

                {/* Left Panel */}
                <div className="hidden md:flex md:w-5/12 bg-brand-600 p-10 flex-col justify-between text-white relative">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-12">
                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-brand-600">
                                <i className="fa-solid fa-bolt-lightning text-lg"></i>
                            </div>
                            <span className="text-xl font-bold tracking-tight">TalentHub</span>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold leading-tight">Tuyển dụng<br />thông minh hơn.</h2>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3 opacity-90 feature-card">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                                        <i className="fa-solid fa-user-plus"></i>
                                    </div>
                                    <span className="text-sm font-medium">Hồ sơ ứng viên</span>
                                </div>
                                <div className="flex items-center gap-3 opacity-90 feature-card">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                                        <i className="fa-solid fa-diagram-project"></i>
                                    </div>
                                    <span className="text-sm font-medium">Pipeline trực quan</span>
                                </div>
                                <div className="flex items-center gap-3 opacity-90 feature-card">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                                        <i className="fa-solid fa-chart-pie"></i>
                                    </div>
                                    <span className="text-sm font-medium">Báo cáo tự động</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* Right Panel */}
                <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="max-w-sm w-full mx-auto">
                        <div className="md:hidden flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                                <i className="fa-solid fa-bolt-lightning text-sm"></i>
                            </div>
                            <span className="text-lg font-bold text-gray-900">TalentHub</span>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập</h1>
                        <p className="text-gray-500 text-sm mb-8">Chào mừng HR quay trở lại hệ thống.</p>



                        <form className="space-y-5" onSubmit={handleLogin}>
                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Công việc</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-600">
                                        <i className="fa-regular fa-envelope"></i>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Mật khẩu</label>
                                    <a href="#" className="text-xs font-bold text-brand-600 hover:underline">Quên?</a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-600">
                                        <i className="fa-solid fa-lock"></i>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={togglePass} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={isLoading}
                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 relative disabled:opacity-70 disabled:cursor-not-allowed">
                                <span className={isLoading ? 'opacity-0' : ''}>Truy cập hệ thống</span>
                                {isLoading && <i className="fa-solid fa-circle-notch animate-spin absolute"></i>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
