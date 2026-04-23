'use client';

import React from 'react';
import {
    X, Save, Wand2, Send,
    Bold, Italic, Underline, Undo, Redo, List, ListOrdered, Image as ImageIcon,
    Paperclip, ChevronDown, Sparkles, Eye, Bot
} from 'lucide-react';
import { AlertData } from './AlertDetailsModal';

interface EmailComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    alertData: AlertData | null;
}

export default function EmailComposeModal({ isOpen, onClose, alertData }: EmailComposeModalProps) {
    if (!isOpen) return null;

    const shipmentId = alertData?.id || 'Shipment #49201';
    const clientName = alertData?.client || 'Customer';
    const clientEmail = alertData?.client ? `contact@${alertData.client.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com` : 'recipient@logistics.com';

    const handleFormat = (command: string, value: string | null = null) => {
        document.execCommand(command, false, value || undefined);
    };

    const handleAction = (e: React.MouseEvent, command: string, value: string | null = null) => {
        e.preventDefault(); // Keep focus on the contentEditable area
        handleFormat(command, value);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        } as React.CSSProperties}>
            <style>{`
                .rich-text-editor ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin: 0.5em 0;
                }
                .rich-text-editor ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin: 0.5em 0;
                }
            `}</style>
            <div style={{
                width: '100%',
                maxWidth: '1200px',
                height: '90vh',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            } as React.CSSProperties}>
                {/* Header */}
                <header style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff'
                } as React.CSSProperties}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                            Email Creation Centre
                        </h2>
                        <span style={{
                            backgroundColor: '#cffafe', color: '#0891b2',
                            padding: '4px 12px', borderRadius: '16px',
                            fontSize: '13px', fontWeight: 500
                        }}>
                            {shipmentId || 'Shipment #49201'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>Draft saved 2m ago</span>

                        <button style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '6px',
                            border: '1px solid #e5e7eb', backgroundColor: 'white',
                            color: '#374151', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer'
                        } as React.CSSProperties}>
                            <Save size={16} /> Save Draft
                        </button>

                        <button style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none', backgroundColor: '#ecfeff',
                            color: '#0891b2', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer'
                        } as React.CSSProperties}>
                            <Sparkles size={16} /> Generate with AI
                        </button>

                        <button style={{
                            padding: '8px 24px', borderRadius: '6px',
                            border: 'none', backgroundColor: '#06b6d4',
                            color: 'white', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer'
                        } as React.CSSProperties}>
                            Send Email
                        </button>

                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9ca3af', padding: '4px', marginLeft: '8px'
                        } as React.CSSProperties}>
                            <X size={20} />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Left Pane: Editor */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' } as React.CSSProperties}>

                        {/* To Field */}
                        <div style={{
                            border: '1px solid #e5e7eb', borderRadius: '8px',
                            padding: '8px 16px', marginBottom: '16px',
                            position: 'relative'
                        } as React.CSSProperties}>
                            <span style={{
                                position: 'absolute', top: '-10px', left: '12px',
                                backgroundColor: 'white', padding: '0 4px',
                                fontSize: '12px', color: '#0284c7', fontWeight: 500
                            } as React.CSSProperties}>To *</span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <input
                                    type="text"
                                    defaultValue={clientEmail}
                                    style={{
                                        border: 'none', outline: 'none', width: '100%',
                                        fontSize: '14px', color: '#111827',
                                        backgroundColor: 'transparent'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px', color: '#6b7280', fontSize: '12px', fontWeight: 500 } as React.CSSProperties}>
                                    <span style={{ cursor: 'pointer' }}>CC</span>
                                    <span style={{ cursor: 'pointer' }}>BCC</span>
                                </div>
                            </div>
                        </div>

                        {/* Subject Field */}
                        <div style={{
                            border: '1px solid #e5e7eb', borderRadius: '8px',
                            padding: '8px 16px', marginBottom: '24px',
                            position: 'relative'
                        } as React.CSSProperties}>
                            <span style={{
                                position: 'absolute', top: '-10px', left: '12px',
                                backgroundColor: 'white', padding: '0 4px',
                                fontSize: '12px', color: '#0284c7', fontWeight: 500
                            } as React.CSSProperties}>Subject *</span>
                            <input
                                type="text"
                                defaultValue={`Update regarding ${shipmentId}`}
                                style={{
                                    border: 'none', outline: 'none', width: '100%',
                                    fontSize: '14px', color: '#111827',
                                    backgroundColor: 'transparent'
                                }}
                            />
                        </div>

                        {/* Editor Toolbar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', color: '#111827' } as React.CSSProperties}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onMouseDown={(e) => handleAction(e, 'bold')} style={toolbarBtnStyle}><Bold size={18} /></button>
                                <button onMouseDown={(e) => handleAction(e, 'italic')} style={toolbarBtnStyle}><Italic size={18} /></button>
                                <button onMouseDown={(e) => handleAction(e, 'underline')} style={toolbarBtnStyle}><Underline size={18} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', color: '#4b5563' } as React.CSSProperties}>
                                <button onMouseDown={(e) => handleAction(e, 'undo')} style={toolbarBtnStyle}><Undo size={18} /></button>
                                <button onMouseDown={(e) => handleAction(e, 'redo')} style={toolbarBtnStyle}><Redo size={18} /></button>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', color: '#4b5563' } as React.CSSProperties}>
                                <button onMouseDown={(e) => handleAction(e, 'insertUnorderedList')} style={toolbarBtnStyle}><List size={18} /></button>
                                <button onMouseDown={(e) => handleAction(e, 'insertOrderedList')} style={toolbarBtnStyle}><ListOrdered size={18} /></button>
                            </div>
                            <button onMouseDown={(e) => {
                                e.preventDefault();
                                const url = window.prompt('Enter image URL:');
                                if (url) handleFormat('insertImage', url);
                            }} style={toolbarBtnStyle}><ImageIcon size={18} /></button>
                        </div>

                        {/* Text Area */}
                        <div style={{ flex: 1, position: 'relative' } as React.CSSProperties}>
                            <div
                                className="rich-text-editor"
                                contentEditable
                                suppressContentEditableWarning
                                style={{
                                    width: '100%', height: '100%', border: 'none', outline: 'none',
                                    overflowY: 'auto', fontSize: '14px', lineHeight: '1.6',
                                    color: '#374151', fontFamily: 'inherit',
                                    paddingBottom: '20px'
                                } as React.CSSProperties}
                                dangerouslySetInnerHTML={{
                                    __html: `Dear ${clientName},<br><br>This is an automated update regarding your ${shipmentId.toLowerCase()}. The cargo has successfully cleared customs and is currently en route to the distribution center in Hamburg.<br>Estimated Time of Arrival: Nov 14, 2023 - 14:00 CET<br><br>Best Regards,<br>Logistics Team`
                                }}
                            />
                        </div>

                        {/* Footer / Attachments */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            paddingTop: '16px', borderTop: '1px solid #f3f4f6',
                            color: '#6b7280', fontSize: '13px'
                        } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <Paperclip size={16} />
                                Attach files
                            </div>
                            <span style={{ color: '#9ca3af' }}>Auto-saving...</span>
                        </div>
                    </div>

                    {/* Right Pane: AI Assistant */}
                    <div style={{
                        width: '320px', borderLeft: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column'
                    } as React.CSSProperties}>

                        {/* Template Select */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Template</div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                border: '1px solid #e5e7eb', borderRadius: '6px',
                                padding: '8px 12px', fontSize: '13px', color: '#374151',
                                cursor: 'pointer'
                            } as React.CSSProperties}>
                                Status Update (standard )
                                <ChevronDown size={14} color="#9ca3af" />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex', borderBottom: '1px solid #f3f4f6',
                            padding: '0 20px'
                        } as React.CSSProperties}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '12px 16px', borderBottom: '2px solid #06b6d4',
                                color: '#06b6d4', fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer'
                            } as React.CSSProperties}>
                                <Sparkles size={14} /> AI Assistant
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '12px 16px', color: '#6b7280',
                                fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                            } as React.CSSProperties}>
                                <Eye size={14} /> Preview
                            </div>
                        </div>

                        {/* AI Content */}
                        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' } as React.CSSProperties}>

                            {/* Suggestion Card */}
                            <div style={{
                                border: '1px solid #f3f4f6', borderRadius: '8px',
                                padding: '16px', marginBottom: '16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            } as React.CSSProperties}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        backgroundColor: '#ecfeff', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: '#06b6d4', flexShrink: 0
                                    }}>
                                        <Sparkles size={14} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' }}>
                                            Suggested Improvement
                                        </h4>
                                        <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                                            The tone seems a bit formal. Would you like to make it friendlier since this is a repeat customer?
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button style={{
                                                background: '#ecfeff', border: 'none',
                                                color: '#0891b2', fontSize: '12px', fontWeight: 500,
                                                padding: '4px 12px', borderRadius: '4px', cursor: 'pointer'
                                            } as React.CSSProperties}>Make Friendly</button>
                                            <button style={{
                                                background: 'transparent', border: 'none',
                                                color: '#9ca3af', fontSize: '12px', fontWeight: 500,
                                                cursor: 'pointer'
                                            } as React.CSSProperties}>Dismiss</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Chat Input */}
                        <div style={{ padding: '20px', borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    backgroundColor: '#06b6d4', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: 'white', flexShrink: 0
                                }}>
                                    <Bot size={14} />
                                </div>
                                <div style={{
                                    border: '1px solid #e5e7eb', borderRadius: '8px',
                                    padding: '12px', fontSize: '12.5px', color: '#6b7280',
                                    backgroundColor: '#f9fafb', lineHeight: '1.5'
                                } as React.CSSProperties}>
                                    I can help you draft this email. Try asking me to "Explain a weather delay" or "Request updated documents".
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}

const toolbarBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};
