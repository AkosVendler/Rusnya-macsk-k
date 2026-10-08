/* Belépési pont: Supabase munkamenet betöltése, majd bejelentkezés vagy főmenü. */
RM.state.loadProfile();
RM.online.init().catch(error => {
	console.error('Indítási hiba:', error);
	RM.screens.auth(`Nem sikerült csatlakozni a szolgáltatáshoz: ${error.message}`);
});
