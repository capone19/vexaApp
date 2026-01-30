import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Key,
  Phone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYCloudConfig, type SaveYCloudConfigInput } from '@/hooks/use-ycloud-config';

export function YCloudIntegration() {
  const { config, isLoading, isConfigured, saveConfig, testConnection } = useYCloudConfig();
  
  const [formData, setFormData] = useState<SaveYCloudConfigInput>({
    api_key: '',
    waba_id: '',
    phone_number_id: '',
    phone_number: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        api_key: config.api_key || '',
        waba_id: config.waba_id || '',
        phone_number_id: config.phone_number_id || '',
        phone_number: config.phone_number || '',
      });
    }
  }, [config]);

  const handleChange = (field: keyof SaveYCloudConfigInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveConfig.mutateAsync(formData);
    setHasChanges(false);
  };

  const handleTestConnection = async () => {
    await testConnection.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                WhatsApp Business (YCloud)
                {isConfigured ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No configurado
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Conecta tu cuenta de YCloud para gestionar plantillas de WhatsApp
              </p>
            </div>
          </div>
          <a
            href="https://www.ycloud.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ir a YCloud
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key" className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              API Key
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.api_key}
                onChange={(e) => handleChange('api_key', e.target.value)}
                placeholder="Tu API Key de YCloud"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encuéntrala en YCloud Dashboard → Settings → API Keys
            </p>
          </div>

          {/* WABA ID */}
          <div className="space-y-2">
            <Label htmlFor="waba_id" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              WABA ID (WhatsApp Business Account ID)
            </Label>
            <Input
              id="waba_id"
              type="text"
              value={formData.waba_id}
              onChange={(e) => handleChange('waba_id', e.target.value)}
              placeholder="Ej: 123456789012345"
            />
            <p className="text-xs text-muted-foreground">
              ID de tu cuenta de WhatsApp Business en YCloud
            </p>
          </div>

          {/* Phone Number ID (optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone_number_id" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number ID
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="phone_number_id"
              type="text"
              value={formData.phone_number_id}
              onChange={(e) => handleChange('phone_number_id', e.target.value)}
              placeholder="Ej: 987654321098765"
            />
          </div>

          {/* Phone Number Display (optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone_number" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Número de teléfono
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="phone_number"
              type="text"
              value={formData.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="Ej: +521234567890"
            />
            <p className="text-xs text-muted-foreground">
              Tu número de WhatsApp Business verificado
            </p>
          </div>
        </div>

        <Separator />

        {/* Last sync info */}
        {config?.last_synced_at && (
          <div className="text-sm text-muted-foreground">
            Última sincronización: {new Date(config.last_synced_at).toLocaleString('es-MX')}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!formData.api_key || !formData.waba_id || testConnection.isPending}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", testConnection.isPending && "animate-spin")} />
            Probar conexión
          </Button>

          <Button
            onClick={handleSave}
            disabled={!formData.api_key || !formData.waba_id || saveConfig.isPending || !hasChanges}
            className="gap-2"
          >
            {saveConfig.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
