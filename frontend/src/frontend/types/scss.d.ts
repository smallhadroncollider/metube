declare module "*.module.scss" {
	const classes: { readonly [key: string]: string };
	export default classes;
}

declare module "*.scss" {
	// Side-effect import for global styles
}
