import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

// ─── Không chỉnh sửa logic bên dưới ─────────────────────────────────────────
const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const togglePass = () => setShowPassword(!showPassword);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('full_name', data.full_name);
                message.success('Đăng nhập thành công! Đang chuyển hướng...');
                setTimeout(() => navigate('/home'), 1000);
            } else {
                message.error('Email hoặc mật khẩu không đúng.');
            }
        } catch {
            message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.');
        } finally {
            setIsLoading(false);
        }
    };
    // ─── Kết thúc vùng logic ─────────────────────────────────────────────────

    return (
        /* Full-screen background: gradient xanh nhạt → tím nhạt */
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 50%, #EEF2FF 100%)',
            }}
        >
            {/* Card trung tâm */}
            <div
                className="w-full bg-white rounded-3xl animate-fadeInUp"
                style={{
                    maxWidth: 480,
                    boxShadow: '0 8px 40px 0 rgba(99, 102, 241, 0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
                }}
            >
                <div className="p-8 sm:p-10">

                    {/* ── Brand icon ── */}
                    <div className="flex justify-center mb-7">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.30)',
                            }}
                        >
                            <i className="fa-solid fa-briefcase text-white text-xl"></i>
                        </div>
                    </div>

                    {/* ── Heading ── */}
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-bold text-slate-900 mb-1.5">
                            Đăng nhập hệ thống
                        </h1>
                        <p className="text-sm text-slate-500">
                            Vui lòng nhập thông tin tài khoản của bạn
                        </p>
                    </div>

                    {/* ── Form ── */}
                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                EMAIL CÁ NHÂN
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <i className="fa-regular fa-envelope text-slate-400 text-sm"></i>
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="input-field w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 border border-slate-200 focus:bg-white"
                                    style={{ background: '#F8FAFC' }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    MẬT KHẨU
                                </label>
                                <a
                                    href="#"
                                    className="text-xs font-medium hover:underline"
                                    style={{ color: '#2563EB' }}
                                >
                                    Quên mật khẩu?
                                </a>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-lock text-slate-400 text-sm"></i>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 border border-slate-200 focus:bg-white"
                                    style={{ background: '#F8FAFC' }}
                                />
                                <button
                                    type="button"
                                    onClick={togglePass}
                                    tabIndex={-1}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2 transition-opacity"
                            style={{
                                background: isLoading
                                    ? 'linear-gradient(135deg, #93C5FD 0%, #C4B5FD 100%)'
                                    : 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.8 : 1,
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập</span>
                                    <i className="fa-solid fa-arrow-right text-sm"></i>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer note */}
                    <p className="mt-6 text-center text-xs text-slate-400">
                        Hệ thống quản lý tuyển dụng &mdash; Chào mừng bạn
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

