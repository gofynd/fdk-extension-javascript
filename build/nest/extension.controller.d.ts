export = AppController;
declare class AppController {
    install(req: any, res: any, next: any): Promise<void>;
    auth(req: any, res: any, next: any): Promise<void>;
    autoInstall(req: any, res: any, next: any): Promise<void>;
    unInstall(req: any, res: any, next: any): Promise<void>;
}
