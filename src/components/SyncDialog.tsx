import { TraktSync } from '@apis/TraktSync';
import { BrowserStorage } from '@common/BrowserStorage';
import { EventDispatcher, SyncDialogShowData } from '@common/Events';
import { I18N } from '@common/I18N';
import { Utils } from '@common/Utils';
import { Center } from '@components/Center';
import { CustomDialogRoot } from '@components/CustomDialogRoot';
import { Item } from '@models/Item';
import { Button, CircularProgress, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { SyncStore } from '@stores/SyncStore';
import { useEffect, useState } from 'react';

export const SyncDialog = (): JSX.Element => {
	const [isOpen, setOpen] = useState(false);

	const closeDialog = (): void => {
		setOpen(false);
	};

	const cancelSync = async () => {
		await EventDispatcher.dispatch('REQUESTS_CANCEL', null, { key: 'sync' });
		closeDialog();
	};

	useEffect(() => {
		const startListeners = () => {
			EventDispatcher.subscribe('SYNC_DIALOG_SHOW', null, openDialog);
		};

		const stopListeners = () => {
			EventDispatcher.unsubscribe('SYNC_DIALOG_SHOW', null, openDialog);
		};

		const openDialog = (data: SyncDialogShowData) => {
			setOpen(true);
			void startSync(data.store, data.serviceId, data.items);
		};

		const startSync = async (store: SyncStore, serviceId: string | null, items: Item[]) => {
			if (!store || items.length === 0) {
				closeDialog();
				return;
			}

			try {
				await TraktSync.sync(store, items);
				if (serviceId) {
					const lastSync = items[0].watchedAt ?? Utils.unix();
					if (lastSync > BrowserStorage.options.services[serviceId].lastSync) {
						await BrowserStorage.saveOptions({
							services: {
								[serviceId]: {
									lastSync,
									lastSyncId: items[0].id,
								},
							},
						});
					}
				} else {
					await BrowserStorage.remove('syncCache');
					await store.resetData();
				}
			} catch (err) {
				// Do nothing
			}

			closeDialog();
		};

		startListeners();
		return stopListeners;
	}, []);

	return (
		<CustomDialogRoot
			open={isOpen}
			aria-labelledby="sync-dialog-title"
			disableEscapeKeyDown={true}
			onClose={() => {
				// Do nothing
			}}
		>
			<DialogTitle id="sync-dialog-title">{I18N.translate('syncing')}</DialogTitle>
			<DialogContent>
				<Center>
					<CircularProgress />
				</Center>
			</DialogContent>
			<DialogActions>
				<Button onClick={cancelSync}>{I18N.translate('cancel')}</Button>
			</DialogActions>
		</CustomDialogRoot>
	);
};