import { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonInput,
  IonRange,
  IonChip,
  IonNote,
  IonItemDivider,
  IonText,
} from '@ionic/react';
import {
  closeOutline,
  arrowBackOutline,
  moonOutline,
  sunnyOutline,
  imageOutline,
  colorPaletteOutline,
  folderOutline,
  archiveOutline,
  downloadOutline,
  cloudUploadOutline,
  logOutOutline,
  refreshOutline,
  trashOutline,
  arrowUndoOutline,
} from 'ionicons/icons';
import { Todo, Theme, Folder } from '../types';
import { isMobile, selectImage } from '../utils/platform';

type SettingsProps = {
  todos: Todo[];
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  alwaysOnTop: boolean;
  onAlwaysOnTopChange: (value: boolean) => void;
  launchAtStartup: boolean;
  onLaunchAtStartupChange: (value: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onClearArchived: () => void;
  folders: Folder[];
  onCreateFolder: (name: string) => void;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  backgroundOverlayOpacity: number;
  onBackgroundOverlayOpacityChange: (opacity: number) => void;
  onLogout?: () => void;
};

export default function Settings({
  todos,
  theme,
  onThemeChange,
  alwaysOnTop,
  onAlwaysOnTopChange,
  launchAtStartup,
  onLaunchAtStartupChange,
  isOpen,
  onClose,
  onExport,
  onImport,
  onDelete,
  onRestore,
  onClearArchived,
  folders,
  onCreateFolder,
  backgroundImage,
  onBackgroundImageChange,
  backgroundColor,
  onBackgroundColorChange,
  backgroundOverlayOpacity,
  onBackgroundOverlayOpacityChange,
  onLogout,
}: SettingsProps) {
  const [view, setView] = useState<'settings' | 'archived'>('settings');
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleSelectImage = async () => {
    const result = await selectImage();
    if (result.success && result.url) {
      onBackgroundImageChange(result.url);
    }
  };

  const handleClose = () => {
    setView('settings');
    onClose();
  };

  const nonArchivedTodos = todos.filter(t => !t.isArchived);
  const archivedTodos = todos.filter(t => t.isArchived);

  const total = nonArchivedTodos.length;
  const completed = nonArchivedTodos.filter(t => t.done).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const highPriority = nonArchivedTodos.filter(t => !t.done && t.priority === 'high').length;
  const overdue = nonArchivedTodos.filter(t =>
    !t.done && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {view === 'archived' ? (
              <IonButton onClick={() => setView('settings')}>
                <IonIcon icon={arrowBackOutline} />
              </IonButton>
            ) : (
              <IonButton onClick={handleClose}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            )}
          </IonButtons>
          <IonLabel slot="start" style={{ marginLeft: '8px', fontWeight: 600 }}>
            {view === 'archived' ? 'Archived' : 'Settings'}
          </IonLabel>
          {view === 'archived' && archivedTodos.length > 0 && (
            <IonButtons slot="end">
              <IonButton onClick={onClearArchived} color="danger">
                Clear All
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {view === 'settings' ? (
          <IonList>
            {/* Appearance Section */}
            <IonItemDivider>
              <IonLabel>Appearance</IonLabel>
            </IonItemDivider>

            <IonItem>
              <IonIcon icon={theme === 'dark' ? moonOutline : sunnyOutline} slot="start" />
              <IonLabel>Dark Mode</IonLabel>
              <IonToggle
                checked={theme === 'dark'}
                onIonChange={e => onThemeChange(e.detail.checked ? 'dark' : 'light')}
              />
            </IonItem>

            <IonItem>
              <IonIcon icon={colorPaletteOutline} slot="start" />
              <IonLabel>Background Color</IonLabel>
              <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={backgroundColor || '#1a1a1a'}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    border: 'none', 
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
                {backgroundColor && (
                  <IonButton fill="clear" size="small" onClick={() => onBackgroundColorChange(null)}>
                    <IonIcon icon={refreshOutline} />
                  </IonButton>
                )}
              </div>
            </IonItem>

            <IonItem>
              <IonIcon icon={imageOutline} slot="start" />
              <IonLabel>Background Image</IonLabel>
              <IonButtons slot="end">
                <IonButton onClick={handleSelectImage}>
                  Upload
                </IonButton>
                {backgroundImage && (
                  <IonButton onClick={() => onBackgroundImageChange(null)} color="danger">
                    <IonIcon icon={trashOutline} />
                  </IonButton>
                )}
              </IonButtons>
            </IonItem>

            {backgroundImage && (
              <IonItem lines="none">
                <div 
                  style={{ 
                    width: '100%', 
                    height: '100px', 
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '8px'
                  }} 
                />
              </IonItem>
            )}

            {(backgroundImage || backgroundColor) && (
              <IonItem>
                <IonLabel>Overlay Opacity</IonLabel>
                <IonRange
                  min={0}
                  max={1}
                  step={0.05}
                  value={backgroundOverlayOpacity}
                  onIonChange={e => onBackgroundOverlayOpacityChange(e.detail.value as number)}
                  style={{ flex: 1 }}
                >
                  <IonLabel slot="end">{Math.round(backgroundOverlayOpacity * 100)}%</IonLabel>
                </IonRange>
              </IonItem>
            )}

            {/* Window Section - Desktop Only */}
            {!isMobile() && (
              <>
                <IonItemDivider>
                  <IonLabel>Window</IonLabel>
                </IonItemDivider>

                <IonItem>
                  <IonLabel>Always on Top</IonLabel>
                  <IonToggle
                    checked={alwaysOnTop}
                    onIonChange={e => onAlwaysOnTopChange(e.detail.checked)}
                  />
                </IonItem>

                <IonItem>
                  <IonLabel>Launch at Startup</IonLabel>
                  <IonToggle
                    checked={launchAtStartup}
                    onIonChange={e => onLaunchAtStartupChange(e.detail.checked)}
                  />
                </IonItem>
              </>
            )}

            {/* Folders Section */}
            <IonItemDivider>
              <IonLabel>Folders</IonLabel>
            </IonItemDivider>

            <IonItem>
              <IonInput
                value={newFolderName}
                onIonInput={e => setNewFolderName(e.detail.value || '')}
                placeholder="New folder name..."
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
              />
              <IonButton 
                slot="end" 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </IonButton>
            </IonItem>

            {folders.map(folder => (
              <IonItem key={folder.id}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel>{folder.name}</IonLabel>
              </IonItem>
            ))}

            {/* Data Section */}
            <IonItemDivider>
              <IonLabel>Data</IonLabel>
            </IonItemDivider>

            <IonItem button onClick={() => setView('archived')}>
              <IonIcon icon={archiveOutline} slot="start" />
              <IonLabel>Archived Tasks</IonLabel>
              <IonChip slot="end">{archivedTodos.length}</IonChip>
            </IonItem>

            <IonItem button onClick={onExport}>
              <IonIcon icon={downloadOutline} slot="start" />
              <IonLabel>Export Data</IonLabel>
            </IonItem>

            <IonItem button onClick={onImport}>
              <IonIcon icon={cloudUploadOutline} slot="start" />
              <IonLabel>Import Data</IonLabel>
            </IonItem>

            {/* Statistics Section */}
            <IonItemDivider>
              <IonLabel>Statistics</IonLabel>
            </IonItemDivider>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px', 
              padding: '16px' 
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: 'var(--ion-background-color-step-100)', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}>{total}</div>
                <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>Total</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: 'var(--ion-background-color-step-100)', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ion-color-warning)' }}>{active}</div>
                <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>Active</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: 'var(--ion-background-color-step-100)', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ion-color-success)' }}>{completed}</div>
                <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>Done</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: 'var(--ion-background-color-step-100)', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{completionRate}%</div>
                <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>Complete</div>
              </div>
              {highPriority > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  background: 'var(--ion-background-color-step-100)', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ion-color-danger)' }}>{highPriority}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>High Priority</div>
                </div>
              )}
              {overdue > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  background: 'var(--ion-background-color-step-100)', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ion-color-danger)' }}>{overdue}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ion-text-color-step-400)' }}>Overdue</div>
                </div>
              )}
            </div>

            {/* Version */}
            <IonItem lines="none">
              <IonNote style={{ width: '100%', textAlign: 'center', padding: '8px' }}>
                Version {(globalThis as any).__APP_VERSION__ || '2.3.3'}
              </IonNote>
            </IonItem>

            {/* Logout */}
            {onLogout && (
              <>
                <IonItemDivider />
                <IonItem 
                  button 
                  onClick={() => {
                    onLogout();
                    handleClose();
                  }}
                  style={{ '--color': 'var(--ion-color-danger)' }}
                >
                  <IonIcon icon={logOutOutline} slot="start" color="danger" />
                  <IonLabel color="danger">Sign Out</IonLabel>
                </IonItem>
              </>
            )}
          </IonList>
        ) : (
          /* Archived View */
          <IonList>
            {archivedTodos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: 'var(--ion-text-color-step-400)'
              }}>
                <IonIcon icon={archiveOutline} style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>No archived tasks</p>
              </div>
            ) : (
              archivedTodos.map(todo => (
                <IonItem key={todo.id}>
                  <IonLabel>
                    <h3>{todo.text}</h3>
                    <p>Created: {new Date(todo.createdAt).toLocaleDateString()}</p>
                  </IonLabel>
                  <IonButtons slot="end">
                    <IonButton onClick={() => onRestore(todo.id)} title="Restore">
                      <IonIcon icon={arrowUndoOutline} />
                    </IonButton>
                    <IonButton onClick={() => onDelete(todo.id)} color="danger" title="Delete">
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonButtons>
                </IonItem>
              ))
            )}
          </IonList>
        )}
      </IonContent>
    </IonModal>
  );
}
