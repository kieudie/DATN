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

    const styles = {
        root: { minHeight: '100vh', width: '100%', display: 'flex', fontFamily: "'Inter', sans-serif" },
        left: {
            width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '48px', background: 'linear-gradient(160deg, #FDFBFF 0%, #F4EAFC 40%, #EDE0F8 100%)',
        },
        card: {
            width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(16px)', borderRadius: 28, padding: '40px 36px',
            boxShadow: '0 8px 40px rgba(160,100,220,0.12), 0 1.5px 4px rgba(0,0,0,0.04)',
            border: '1px solid rgba(220,200,240,0.5)',
        },
        logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 32 },
        logoImg: { width: 72, height: 72, objectFit: 'contain', mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 12px rgba(120,60,200,0.2))' },
        headingWrap: { textAlign: 'center', marginBottom: 36 },
        h1: { fontSize: 28, fontWeight: 800, color: '#2D1B4E', margin: '0 0 6px', letterSpacing: -0.3 },
        sub: { fontSize: 14, color: '#8B7AA0', margin: 0 },
        form: { display: 'flex', flexDirection: 'column', gap: 20 },
        label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#3B2C5C', marginBottom: 8 },
        inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
        icon: { position: 'absolute', left: 16, fontSize: 15, color: '#A87BD8', pointerEvents: 'none', zIndex: 2 },
        input: {
            width: '100%', padding: '14px 16px 14px 46px', borderRadius: 16,
            border: '1.5px solid #E8DAF0', background: '#FFF', fontSize: 14, color: '#2D1B4E',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
        },
        inputPwd: { paddingRight: 48 },
        eyeBtn: {
            position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer',
            color: '#A87BD8', fontSize: 15, padding: 4, display: 'flex', alignItems: 'center', zIndex: 2,
        },
        submit: {
            width: '100%', padding: '15px 24px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #9C3FE4 0%, #D94FB8 100%)', color: '#FFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, marginTop: 8, fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(180,80,210,0.35)', transition: 'opacity 0.2s',
        },
        submitDisabled: {
            background: '#E0CCF0', boxShadow: 'none', cursor: 'not-allowed', opacity: 0.75,
        },
        right: {
            width: '50%', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        rightBg: {
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 1,
        },
    };

    return (
        <>
            <style>{`
                @media (max-width: 1023px) {
                    .login-right-panel { display: none !important; }
                    .login-left-panel { width: 100% !important; }
                }
                @media (max-width: 640px) {
                    .login-left-panel { padding: 24px 20px !important; }
                }
            `}</style>

            <div style={styles.root}>
                {/* Left: Form */}
                <div className="login-left-panel" style={styles.left}>
                    <div style={styles.card}>
                        <div style={styles.logoWrap}>
                            <img src="/cg-logo.png" alt="CG Studio" style={styles.logoImg} />
                        </div>

                        <div style={styles.headingWrap}>
                            <h1 style={styles.h1}>Đăng nhập</h1>
                            <p style={styles.sub}>Chào mừng bạn trở lại</p>
                        </div>

                        <form onSubmit={handleLogin} style={styles.form}>
                            <div>
                                <label style={styles.label}>Email *</label>
                                <div style={styles.inputWrap}>
                                    <i className="fa-regular fa-envelope" style={styles.icon}></i>
                                    <input
                                        type="email" required value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@cgstudio.com.vn"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={styles.label}>Mật khẩu *</label>
                                <div style={styles.inputWrap}>
                                    <i className="fa-solid fa-lock" style={styles.icon}></i>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{ ...styles.input, ...styles.inputPwd }}
                                    />
                                    <button type="button" onClick={togglePass} tabIndex={-1} style={styles.eyeBtn}>
                                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={isLoading}
                                style={isLoading ? { ...styles.submit, ...styles.submitDisabled } : styles.submit}
                            >
                                {isLoading ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i><span>Đang đăng nhập...</span></>
                                ) : (
                                    <span>Đăng nhập</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right: Background image only (image already contains all branding) */}
                <div className="login-right-panel" style={styles.right}>
                    <img src="/login-bg-right.png" alt="" style={styles.rightBg} />
                </div>
            </div>
        </>
    );
};

export default Login;
