'use client';

import React from 'react';
import {
    X, MapPin, Truck, AlertCircle, Clock, Package, CheckCircle2, Navigation, Anchor, Plane, Warehouse, User, FileText, Calendar, Mail
} from 'lucide-react';

export interface AlertData {
    id: string;
    client: string;
    clientInitial?: string;
    clientColor?: string;
    priority: 'Critical' | 'Medium' | 'Low';
    milestone: string;
    milestoneIcon: 'anchor' | 'truck' | 'warehouse' | 'plane' | 'navigation';
    issue: string;
    delay: string;
    delayColor?: string;
    status: 'Get Action' | 'Action Taken' | 'Resolved';
    resolvedAt?: string;
}

interface MilestoneIconProps {
    type: AlertData['milestoneIcon'];
}

function MilestoneIcon({ type }: MilestoneIconProps) {
    const props = { size: 16, color: '#6b7280' };
    const icons = {
        anchor: <Anchor {...props} />,
        truck: <Truck {...props} />,
        warehouse: <Warehouse {...props} />,
        plane: <Plane {...props} />,
        navigation: <Navigation {...props} />,
    };
    return icons[type] || <Package {...props} />;
}

interface BadgeProps {
    level?: AlertData['priority'];
    status?: AlertData['status'];
}

function PriorityBadge({ level }: { level: AlertData['priority'] }) {
    const map = {
        Critical: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
        Medium: { bg: '#fefce8', color: '#ca8a04', dot: '#eab308' },
        Low: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
    };
    const s = map[level] || map.Low;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: s.bg, color: s.color,
            fontSize: '11.5px', fontWeight: 600,
            padding: '3px 9px', borderRadius: '20px',
        }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {level}
        </span>
    );
}

function StatusBadge({ status }: { status: AlertData['status'] }) {
    const map = {
        'Get Action': { bg: '#fff0f0', color: '#dc2626', border: '#fca5a5' },
        'Action Taken': { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
        'Resolved': { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    };
    const s = map[status] || map['Get Action'];
    return (
        <span style={{
            display: 'inline-block',
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            fontSize: '11px', fontWeight: 600,
            padding: '3px 10px', borderRadius: '6px',
            whiteSpace: 'nowrap',
        }}>
            {status}
        </span>
    );
}

interface AlertDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    alertData: AlertData | null;
    onEmailClick?: (data: AlertData) => void;
}

export default function AlertDetailsModal({ isOpen, onClose, alertData, onEmailClick }: AlertDetailsModalProps) {
    if (!isOpen || !alertData) return null;

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
            <div style={{
                width: '100%',
                maxWidth: '650px',
                maxHeight: '90vh',
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
                    padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff'
                } as React.CSSProperties}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '8px',
                            background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Package size={20} color="#4b5563" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {alertData.id}
                                <PriorityBadge level={alertData.priority} />
                                <StatusBadge status={alertData.status} />
                            </h2>
                            <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                                Shipment Tracking Details & Issue Analysis
                            </span>
                        </div>
                    </div>

                    <button onClick={onClose} style={{
                        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '50%', cursor: 'pointer',
                        color: '#6b7280', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    } as React.CSSProperties}>
                        <X size={18} />
                    </button>
                </header>

                {/* Main Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' } as React.CSSProperties}>

                    {/* Key Info Grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px'
                    } as React.CSSProperties}>
                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #f3f4f6' } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#6b7280', fontSize: '12.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties}>
                                <User size={14} /> Client Identity
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: alertData.clientColor || '#3b82f6', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '12px'
                                } as React.CSSProperties}>
                                    {alertData.clientInitial || alertData.client?.charAt(0) || 'C'}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                    {alertData.client}
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #f3f4f6' } as React.CSSProperties}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#6b7280', fontSize: '12.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties}>
                                <Clock size={14} /> Current Delay
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: alertData.delayColor || '#dc2626' }}>
                                {alertData.delay}
                            </div>
                        </div>
                    </div>

                    {/* Issue Description */}
                    <div style={{
                        border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px'
                    } as React.CSSProperties}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#111827', fontSize: '14px', fontWeight: 700 } as React.CSSProperties}>
                            <AlertCircle size={16} color="#dc2626" />
                            Issue Description
                        </div>
                        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
                            {alertData.issue}
                        </p>
                    </div>

                    {/* Milestone / Location */}
                    <div style={{
                        border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px'
                    } as React.CSSProperties}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#111827', fontSize: '14px', fontWeight: 700 } as React.CSSProperties}>
                            <MapPin size={16} color="#2563eb" />
                            Location & Milestone
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            } as React.CSSProperties}>
                                <MilestoneIcon type={alertData.milestoneIcon} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                                    {alertData.milestone} Phase
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                    The shipment encountered an issue during this stage of the supply chain.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Metadata (Mocked) */}
                    <div style={{
                        background: '#f9fafb', borderRadius: '8px', padding: '16px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '1px solid #f3f4f6'
                    } as React.CSSProperties}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' } as React.CSSProperties}>Reported By</div>
                            <div style={{ fontSize: '13px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties}><User size={12} /> System Auto-Alert</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' } as React.CSSProperties}>Date Time</div>
                            <div style={{ fontSize: '13px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties}><Calendar size={12} /> {new Date().toLocaleDateString()} - 14:00</div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '12px'
                } as React.CSSProperties}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: '6px',
                        border: '1px solid #e5e7eb', backgroundColor: 'white',
                        color: '#374151', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer'
                    } as React.CSSProperties}>
                        Close
                    </button>
                    {onEmailClick && (
                        <button onClick={() => onEmailClick(alertData)} style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: '1px solid #e5e7eb', backgroundColor: 'white',
                            color: '#4b5563', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        } as React.CSSProperties}>
                            <Mail size={14} /> Email Client
                        </button>
                    )}
                    {alertData.status !== 'Resolved' && (
                        <button style={{
                            padding: '8px 16px', borderRadius: '6px',
                            border: 'none', backgroundColor: '#2563eb',
                            color: 'white', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        } as React.CSSProperties}>
                            <CheckCircle2 size={14} /> Mark as Resolved
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
