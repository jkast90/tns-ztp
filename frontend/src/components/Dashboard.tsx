import { useState, useEffect, useMemo } from 'react';
import { useDevices, useDiscovery, useTemplates, useVendors, getServices, formatRelativeTime } from '@core';
import type { DiscoveryLog, DeviceStatus } from '@core';
import { Card } from './Card';
import { Button } from './Button';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}

function MetricCard({ title, value, icon, color, subtitle, onClick }: MetricCardProps) {
  return (
    <div
      className="dashboard-metric"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-icon" style={{ background: color }}>
        <Icon name={icon} size={24} />
      </div>
      <div className="metric-content">
        <span className="metric-value">{value}</span>
        <span className="metric-title">{title}</span>
        {subtitle && <span className="metric-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { devices } = useDevices({ autoRefresh: true, refreshInterval: 10000 });
  const { discovered } = useDiscovery({ autoRefresh: true, refreshInterval: 10000 });
  const { templates } = useTemplates({ vendorFilter: 'all' });
  const { vendors } = useVendors();

  const [logs, setLogs] = useState<DiscoveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Fetch recent activity logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const services = getServices();
        const data = await services.discovery.listLogs(20);
        setLogs(data);
      } catch (err) {
        console.warn('Failed to fetch logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  // Calculate device status counts
  const statusCounts = useMemo(() => {
    const counts: Record<DeviceStatus, number> = {
      online: 0,
      offline: 0,
      provisioning: 0,
      unknown: 0,
    };
    devices.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [devices]);

  // Calculate devices with recent backups (last 24 hours)
  const recentBackups = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return devices.filter((d) => d.last_backup && new Date(d.last_backup).getTime() > oneDayAgo).length;
  }, [devices]);

  // Get event type icon and color
  const getEventStyle = (eventType: string) => {
    switch (eventType) {
      case 'discovered':
        return { icon: 'search', color: 'var(--color-accent-cyan)' };
      case 'added':
        return { icon: 'add_circle', color: 'var(--color-success)' };
      case 'lease_renewed':
        return { icon: 'refresh', color: 'var(--color-accent-blue)' };
      case 'lease_expired':
        return { icon: 'timer_off', color: 'var(--color-warning)' };
      default:
        return { icon: 'info', color: 'var(--color-text-muted)' };
    }
  };

  return (
    <div className="dashboard">
      {/* Metrics Row */}
      <div className="dashboard-metrics">
        <MetricCard
          title="Total Devices"
          value={devices.length}
          icon="devices"
          color="var(--gradient-primary)"
          subtitle={`${statusCounts.online} online`}
          onClick={() => onNavigate?.('devices')}
        />
        <MetricCard
          title="Pending Discovery"
          value={discovered.length}
          icon="radar"
          color="var(--gradient-accent)"
          subtitle="Waiting to be added"
          onClick={() => onNavigate?.('discovery')}
        />
        <MetricCard
          title="Templates"
          value={templates.length}
          icon="description"
          color="var(--gradient-purple)"
          onClick={() => onNavigate?.('templates')}
        />
        <MetricCard
          title="Vendors"
          value={vendors.length}
          icon="business"
          color="linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
          onClick={() => onNavigate?.('vendors')}
        />
      </div>

      {/* Two-column layout */}
      <div className="dashboard-grid">
        {/* Device Status Overview */}
        <Card title="Device Status" headerAction={
          <Button variant="secondary" size="sm" onClick={() => onNavigate?.('devices')}>
            View All
          </Button>
        }>
          <div className="status-grid">
            <div className="status-item status-online">
              <Icon name="check_circle" size={20} />
              <span className="status-count">{statusCounts.online}</span>
              <span className="status-label">Online</span>
            </div>
            <div className="status-item status-offline">
              <Icon name="cancel" size={20} />
              <span className="status-count">{statusCounts.offline}</span>
              <span className="status-label">Offline</span>
            </div>
            <div className="status-item status-provisioning">
              <Icon name="sync" size={20} />
              <span className="status-count">{statusCounts.provisioning}</span>
              <span className="status-label">Provisioning</span>
            </div>
            <div className="status-item status-unknown">
              <Icon name="help" size={20} />
              <span className="status-count">{statusCounts.unknown}</span>
              <span className="status-label">Unknown</span>
            </div>
          </div>

          {/* Backup status */}
          <div className="backup-summary">
            <Icon name="backup" size={18} />
            <span>{recentBackups} device{recentBackups !== 1 ? 's' : ''} backed up in last 24h</span>
          </div>

          {/* Quick list of recent devices */}
          {devices.length > 0 && (
            <div className="recent-devices">
              <h4>Recent Devices</h4>
              {devices.slice(0, 5).map((device) => (
                <div key={device.mac} className="recent-device-item">
                  <span className={`status-dot status-${device.status}`} />
                  <span className="device-name">{device.hostname}</span>
                  <span className="device-ip">{device.ip}</span>
                  {device.last_seen && (
                    <Tooltip content={`Last seen: ${new Date(device.last_seen).toLocaleString()}`}>
                      <span className="device-seen">{formatRelativeTime(device.last_seen)}</span>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" headerAction={
          <Button variant="secondary" size="sm" onClick={() => onNavigate?.('discovery')}>
            View All
          </Button>
        }>
          {logsLoading ? (
            <div className="activity-loading">Loading activity...</div>
          ) : logs.length === 0 ? (
            <div className="activity-empty">
              <Icon name="inbox" size={32} />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="activity-list">
              {logs.slice(0, 10).map((log) => {
                const style = getEventStyle(log.event_type);
                return (
                  <div key={log.id} className="activity-item">
                    <div className="activity-icon" style={{ color: style.color }}>
                      <Icon name={style.icon} size={16} />
                    </div>
                    <div className="activity-content">
                      <span className="activity-type">{log.event_type.replace('_', ' ')}</span>
                      <span className="activity-details">
                        {log.hostname || log.ip}
                        {log.vendor && <span className="activity-vendor"> ({log.vendor})</span>}
                      </span>
                      {log.message && <span className="activity-message">{log.message}</span>}
                    </div>
                    <Tooltip content={new Date(log.created_at).toLocaleString()}>
                      <span className="activity-time">{formatRelativeTime(log.created_at)}</span>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="quick-actions">
          <Button onClick={() => onNavigate?.('devices')}>
            <Icon name="add" size={16} />
            Add Device
          </Button>
          <Button variant="secondary" onClick={() => onNavigate?.('discovery')}>
            <Icon name="search" size={16} />
            Check Discovery
          </Button>
          <Button variant="secondary" onClick={() => onNavigate?.('templates')}>
            <Icon name="description" size={16} />
            Manage Templates
          </Button>
          <Button variant="secondary" onClick={() => onNavigate?.('vendors')}>
            <Icon name="business" size={16} />
            Configure Vendors
          </Button>
        </div>
      </Card>
    </div>
  );
}
