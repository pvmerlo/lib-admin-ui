module api.ui.text {

    import InputEl = api.dom.InputEl;
    import StringHelper = api.util.StringHelper;
    import CheckEmailAvailabilityRequest = api.security.CheckEmailAvailabilityRequest;
    import i18n = api.util.i18n;

    export class EmailInput
        extends api.dom.CompositeFormInputEl {

        private input: InputEl;

        private originEmail: string;

        private status: string;

        private checkTimeout: number;

        private userStoreKey: api.security.UserStoreKey;

        private focusListeners: { (event: FocusEvent): void }[];

        private blurListeners: { (event: FocusEvent): void }[];

        constructor() {
            super();

            this.focusListeners = [];
            this.blurListeners = [];

            this.input = this.createInput();

            this.setWrappedInput(this.input);

            this.addClass('email-input just-shown');
            this.updateStatus('available');
        }

        createInput(): InputEl {
            let input = new InputEl(undefined, 'email');
            // tslint:disable-next-line:max-line-length
            input.setPattern(
                '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$');

            input.onFocus((event: FocusEvent) => {
                this.notifyFocused(event);
            });

            input.onBlur((event: FocusEvent) => {
                this.notifyBlurred(event);
            });
            input.onInput(() => {
                if (this.checkTimeout) {
                    clearTimeout(this.checkTimeout);
                }

                this.checkTimeout = setTimeout((email) => this.checkAvailability(email), 500, this.input.getValue());

            });

            return input;
        }

        getInput(): InputEl {
            return this.input;
        }

        doSetValue(value: string, silent?: boolean): EmailInput {
            super.doSetValue(value, silent);
            this.checkAvailability(value);
            return this;
        }

        getOriginEmail(): string {
            return this.originEmail;
        }

        setOriginEmail(value: string): EmailInput {
            this.originEmail = value;
            return this;
        }

        setUserStoreKey(userStoreKey: api.security.UserStoreKey): EmailInput {
            this.userStoreKey = userStoreKey;
            return this;
        }

        isAvailable(): boolean {
            return this.hasClass('available');
        }

        private checkAvailability(email: string) {
            let status;
            let isValid = this.input.isValid();
            this.toggleClass('invalid', !isValid);
            if (!isValid) {
                this.getEl().setAttribute('data-status', i18n('field.emailInput.invalid'));
            }

            if (!StringHelper.isEmpty(email) && isValid) {
                status = 'checking';
                let promise;
                if (email === this.originEmail) {
                    promise = wemQ(true);
                } else {
                    promise = new CheckEmailAvailabilityRequest(email).setUserStoreKey(this.userStoreKey).sendAndParse();
                }
                promise.then((available: boolean) => {
                    this.updateStatus(available ? 'available' : 'notavailable');
                    this.notifyValidityChanged(isValid && available);
                    this.removeClass('just-shown');
                }).fail(() => {
                    this.notifyValidityChanged(false);
                    this.updateStatus('error');
                }).done();
            } else {
                this.notifyValidityChanged(isValid);
            }

            this.updateStatus(status);
        }

        private updateStatus(status?: string) {
            if (!!this.status) {
                this.removeClass(this.status);
            }
            if (!StringHelper.isEmpty(status)) {
                this.status = status;
                this.addClass(this.status);
                this.getEl().setAttribute('data-status', i18n(`field.emailInput.${status}`));
            }
        }

        isValid(): boolean {
            return this.input.isValid() && !StringHelper.isEmpty(this.doGetValue()) && this.isAvailable();
        }

        validate(): boolean {
            return this.input.validate();
        }

        onFocus(listener: (event: FocusEvent) => void) {
            this.focusListeners.push(listener);
        }

        unFocus(listener: (event: FocusEvent) => void) {
            this.focusListeners = this.focusListeners.filter((curr) => {
                return curr !== listener;
            });
        }

        onBlur(listener: (event: FocusEvent) => void) {
            this.blurListeners.push(listener);
        }

        unBlur(listener: (event: FocusEvent) => void) {
            this.blurListeners = this.blurListeners.filter((curr) => {
                return curr !== listener;
            });
        }

        private notifyFocused(event: FocusEvent) {
            this.focusListeners.forEach((listener) => {
                listener(event);
            });
        }

        private notifyBlurred(event: FocusEvent) {
            this.blurListeners.forEach((listener) => {
                listener(event);
            });
        }
    }
}
