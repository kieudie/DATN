import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <h1 className="text-[12rem] font-black text-gray-50 opacity-50 select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-brand-600 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-12">
                        <i className="fa-solid fa-ghost text-4xl"></i>
                    </div>
                </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ối! Trang này không tồn tại</h2>
            <p className="text-gray-500 max-w-md mb-10 leading-relaxed">
                Có vẻ như đường dẫn bạn đang truy cập đã bị thay đổi hoặc không còn tồn tại trong hệ thống TalentHub.
            </p>
            <button 
                onClick={() => navigate('/home')}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-brand-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
            >
                <i className="fa-solid fa-house"></i>
                Quay về Trang chủ
            </button>
        </div>
    );
};

export default NotFound;
