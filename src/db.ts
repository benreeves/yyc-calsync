import { DataSource } from "typeorm";

let ds: DataSource = null;
export async function initialize(){
	ds = new DataSource({
		type: "postgres",
		host: process.env.TYPEORM_HOST,
		port: 5432,
		username: process.env.TYPEORM_USERNAME,
		password: process.env.TYPEORM_PASSWORD,
		database: process.env.TYPEORM_DATABASE,
		synchronize: true,
		logging: true
	});
	await ds.initialize();

}
export async function getDatasource(){
	if (ds == null) {
		throw new Error("Must call initialize");
	}
	return ds
}
