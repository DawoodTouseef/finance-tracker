import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { 
  Download, 
  Upload, 
  Trash2, 
  Shield, 
  Database, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface BackupMetadata {
  id: string;
  userId: string;
  fileName: string;
  size: number;
  createdAt: string;
  description?: string;
}

export default function BackupManager() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const backend = useBackend();

  const { data: backups, isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: () => backend.finance.listBackups(),
  });

  const createBackupMutation = useMutation({
    mutationFn: () => backend.finance.createBackup(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast({
        title: "Backup Created",
        description: `Backup ${result.fileName} created successfully`,
      });
      // Automatically download the backup
      window.open(result.downloadUrl, '_blank');
    },
    onError: (error: any) => {
      console.error("Create backup error:", error);
      toast({
        title: "Backup Failed",
        description: error?.message || "Failed to create backup",
        variant: "destructive",
      });
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: (backupId: string) => backend.finance.downloadBackup({ backupId }),
    onSuccess: (result) => {
      window.open(result.downloadUrl, '_blank');
      toast({
        title: "Download Started",
        description: "Your backup download has started",
      });
    },
    onError: (error: any) => {
      console.error("Download backup error:", error);
      toast({
        title: "Download Failed",
        description: error?.message || "Failed to download backup",
        variant: "destructive",
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupId: string) => backend.finance.deleteBackup({ backupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast({
        title: "Backup Deleted",
        description: "Backup deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Delete backup error:", error);
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (params: { backupId: string; replaceExisting: boolean }) => 
      backend.finance.restoreBackup(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      
      toast({
        title: "Restore Complete",
        description: `Restored ${Object.values(result.restoredItems).reduce((a, b) => a + b, 0)} items`,
      });
      setSelectedBackup(null);
    },
    onError: (error: any) => {
      console.error("Restore backup error:", error);
      toast({
        title: "Restore Failed",
        description: error?.message || "Failed to restore backup",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await createBackupMutation.mutateAsync();
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownload = (backupId: string) => {
    downloadBackupMutation.mutate(backupId);
  };

  const handleDelete = (backupId: string) => {
    if (confirm("Are you sure you want to delete this backup? This action cannot be undone.")) {
      deleteBackupMutation.mutate(backupId);
    }
  };

  const handleRestore = (backupId: string) => {
    if (confirm(`Are you sure you want to restore from this backup? ${replaceExisting ? 'This will replace all existing data.' : 'This will add to your existing data.'}`)) {
      restoreBackupMutation.mutate({ backupId, replaceExisting });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="text-gray-600 mt-2">Secure your financial data with encrypted backups</p>
        </div>
        <Button
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          className="flex items-center space-x-2"
        >
          {isCreatingBackup ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>{isCreatingBackup ? "Creating..." : "Create Backup"}</span>
        </Button>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          All backups are encrypted with AES-256 encryption before storage. Your financial data is protected both in transit and at rest.
        </AlertDescription>
      </Alert>

      {/* Restore Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Restore Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="replace-existing"
              checked={replaceExisting}
              onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
            />
            <Label htmlFor="replace-existing" className="text-sm">
              Replace existing data (Warning: This will delete all current data)
            </Label>
          </div>
          {replaceExisting && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This option will permanently delete all your current financial data and replace it with the backup data.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Backups</span>
            <Badge variant="secondary">
              {backups?.backups.length || 0} backups
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-500">Loading backups...</p>
            </div>
          ) : backups?.backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">No backups yet</h3>
              <p>Create your first backup to secure your financial data</p>
              <Button onClick={handleCreateBackup} className="mt-4">
                <Database className="mr-2 h-4 w-4" />
                Create First Backup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {backups?.backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{backup.fileName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(backup.createdAt)}</span>
                        </div>
                        <span>{formatFileSize(backup.size)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.id)}
                      disabled={downloadBackupMutation.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(backup.id)}
                      disabled={restoreBackupMutation.isPending}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(backup.id)}
                      disabled={deleteBackupMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Information */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2">What's included in backups:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All categories (income & expense)</li>
                <li>• All transactions with details</li>
                <li>• Budget configurations</li>
                <li>• Financial goals</li>
                <li>• Bills and payment history</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Security features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AES-256 encryption</li>
                <li>• Secure cloud storage</li>
                <li>• User-specific access control</li>
                <li>• Encrypted file downloads</li>
                <li>• Data integrity verification</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Backups are automatically encrypted and can only be accessed by you. Keep your backup files in a secure location.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
