import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SystemStats {
  ram: {
    used: number;  // GB
    total: number; // GB
    percentage: number;
  };
  cpu: {
    percentage: number;
    cores: number;
    model: string;
  };
  gpu: {
    available: boolean;
    name?: string;
    vram?: {
      used: number;  // GB
      total: number; // GB
      percentage: number;
    };
  };
}

// Get CPU usage by sampling /proc/stat (Linux) or using os.loadavg as fallback
async function getCpuUsage(): Promise<number> {
  try {
    // Use load average as a percentage estimate (1-minute average)
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    // Convert load average to percentage (capped at 100)
    return Math.min(Math.round((loadAvg / cpuCount) * 100), 100);
  } catch {
    return 0;
  }
}

// Try to get NVIDIA GPU info via nvidia-smi
async function getNvidiaGpuInfo(): Promise<SystemStats['gpu']> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader,nounits',
      { timeout: 5000 }
    );
    
    const lines = stdout.trim().split('\n');
    if (lines.length > 0 && lines[0]) {
      const [name, usedMB, totalMB] = lines[0].split(', ').map(s => s.trim());
      const usedGB = parseInt(usedMB) / 1024;
      const totalGB = parseInt(totalMB) / 1024;
      
      return {
        available: true,
        name: name,
        vram: {
          used: Math.round(usedGB * 100) / 100,
          total: Math.round(totalGB * 100) / 100,
          percentage: Math.round((usedGB / totalGB) * 100),
        },
      };
    }
  } catch {
    // nvidia-smi not available or failed
  }
  
  return { available: false };
}

// Try to get AMD GPU info (ROCm)
async function getAmdGpuInfo(): Promise<SystemStats['gpu']> {
  try {
    // Try rocm-smi for AMD GPUs
    const { stdout } = await execAsync(
      'rocm-smi --showmeminfo vram --csv',
      { timeout: 5000 }
    );
    
    // Parse ROCm output (format varies)
    if (stdout.includes('vram')) {
      // This is a basic implementation - ROCm output varies by version
      return { available: true, name: 'AMD GPU (ROCm)' };
    }
  } catch {
    // rocm-smi not available
  }
  
  return { available: false };
}

// Try macOS GPU info
async function getMacGpuInfo(): Promise<SystemStats['gpu']> {
  try {
    const { stdout } = await execAsync(
      'system_profiler SPDisplaysDataType 2>/dev/null | grep "Chipset Model"',
      { timeout: 5000 }
    );
    
    const match = stdout.match(/Chipset Model:\s*(.+)/);
    if (match) {
      return { available: true, name: match[1].trim() };
    }
  } catch {
    // Not macOS or failed
  }
  
  return { available: false };
}

export async function GET() {
  try {
    // RAM info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const ramStats = {
      used: Math.round((usedMem / (1024 ** 3)) * 100) / 100,
      total: Math.round((totalMem / (1024 ** 3)) * 100) / 100,
      percentage: Math.round((usedMem / totalMem) * 100),
    };

    // CPU info
    const cpus = os.cpus();
    const cpuStats = {
      percentage: await getCpuUsage(),
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
    };

    // GPU info - try different methods
    let gpuStats = await getNvidiaGpuInfo();
    
    if (!gpuStats.available) {
      gpuStats = await getAmdGpuInfo();
    }
    
    if (!gpuStats.available) {
      gpuStats = await getMacGpuInfo();
    }

    const stats: SystemStats = {
      ram: ramStats,
      cpu: cpuStats,
      gpu: gpuStats,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting system stats:', error);
    return NextResponse.json(
      { error: 'Failed to get system stats' },
      { status: 500 }
    );
  }
}
